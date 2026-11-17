import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';

import 'package:image_picker/image_picker.dart';

import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/network/chat_socket.dart';
import '../../core/repositories.dart';
import '../../core/session.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';
import '../common.dart';
import '../profile/report_sheet.dart';
import 'chat_providers.dart';

/// Conversation screen (PRD §8.12 / §14): item title, safe counterpart name, claim
/// status, messages with anti-fraud hints, attachments, report/block, handoff actions.
/// Live updates arrive over WebSocket; REST history covers reconnects.
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key, required this.conversationId});
  final String conversationId;
  @override
  ConsumerState<ChatScreen> createState() => _ChatState();
}

class _ChatState extends ConsumerState<ChatScreen> {
  final input = TextEditingController();
  final scroll = ScrollController();
  final Map<String, Message> byId = {};
  Object? error;
  bool loading = true,
      sending = false,
      fetching = false,
      hasMore = false,
      uploading = false;
  Timer? fallbackPoll;
  StreamSubscription<Message>? sub;
  String? pendingId, pendingBody;
  late final ChatSocket socket;

  List<Message> get messages =>
      byId.values.toList()..sort((a, b) => a.createdAt.compareTo(b.createdAt));

  @override
  void initState() {
    super.initState();
    socket = ref.read(chatSocketProvider);
    socket.acquire();
    sub = socket.messages.listen((m) {
      if (m.conversationId != widget.conversationId) return;
      if (mounted) setState(() => byId[m.id] = m);
      ref
          .read(messagingRepositoryProvider)
          .markRead(widget.conversationId, m.id)
          .catchError((_) {});
    });
    socket.state.addListener(onSocketState);
    load();
  }

  void onSocketState() {
    // While the socket is down, fall back to polling so nothing is missed (PRD §22.5).
    fallbackPoll?.cancel();
    if (socket.state.value != SocketState.connected) {
      fallbackPoll = Timer.periodic(
        const Duration(seconds: 10),
        (_) => load(quiet: true),
      );
    } else {
      load(quiet: true);
    }
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    fallbackPoll?.cancel();
    sub?.cancel();
    socket.state.removeListener(onSocketState);
    socket.release();
    input.dispose();
    scroll.dispose();
    super.dispose();
  }

  Future<void> load({bool quiet = false, bool older = false}) async {
    if (fetching) return;
    fetching = true;
    try {
      final repo = ref.read(messagingRepositoryProvider);
      final list = messages;
      final newest = list.isEmpty ? null : list.last.id;
      final result = await repo.history(
        widget.conversationId,
        myId: ref.read(currentUserIdProvider),
        before: older && list.isNotEmpty ? list.first.id : null,
        after: quiet && !older && newest != null ? newest : null,
      );
      if (mounted) {
        setState(() {
          for (final m in result.items) {
            byId[m.id] = m;
          }
          if (!quiet || older) hasMore = result.hasMore;
          loading = false;
          error = null;
        });
      }
      final all = messages;
      if (all.isNotEmpty && !older) {
        await repo.markRead(widget.conversationId, all.last.id);
      }
    } catch (e) {
      if (mounted && (!quiet || byId.isEmpty)) {
        setState(() {
          error = e;
          loading = false;
        });
      }
    } finally {
      fetching = false;
    }
  }

  Future<void> send({String? attachmentMediaId}) async {
    final body = input.text.trim();
    if ((body.isEmpty && attachmentMediaId == null) || sending) return;
    // Keep the same client id when retrying after an uncertain network response (dedupe).
    if (pendingBody != body) {
      pendingId = requestId();
      pendingBody = body;
    }
    setState(() => sending = true);
    await runAction(context, () async {
      final m = await ref
          .read(messagingRepositoryProvider)
          .send(
            widget.conversationId,
            body: body,
            clientMessageId: pendingId!,
            attachmentMediaId: attachmentMediaId,
          );
      input.clear();
      pendingId = null;
      pendingBody = null;
      if (mounted) setState(() => byId[m.id] = m);
      ref.invalidate(conversationsProvider);
    });
    if (mounted) setState(() => sending = false);
  }

  Future<void> attach() async {
    setState(() => uploading = true);
    await runAction(context, () async {
      final photo = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 2000,
        maxHeight: 2000,
        imageQuality: 85,
      );
      if (photo == null) return;
      final media = await ref
          .read(mediaRepositoryProvider)
          .upload(
            await photo.readAsBytes(),
            filename: photo.name,
            suggestions: false,
          );
      if (!media.ready) {
        if (mounted) showSnack(context, context.l10n.photoBlocked, error: true);
        return;
      }
      await send(attachmentMediaId: media.id);
    });
    if (mounted) setState(() => uploading = false);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final conversation = ref
        .watch(conversationsProvider)
        .value
        ?.where((c) => c.id == widget.conversationId)
        .firstOrNull;
    final closed = conversation != null && conversation.status != 'ACTIVE';
    final list = messages;
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(
          children: [
            InitialAvatar(name: conversation?.otherName ?? '', size: 36),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    conversation?.otherName ?? l.chatsTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: t.textTheme.titleMedium,
                  ),
                  ValueListenableBuilder(
                    valueListenable: socket.state,
                    builder: (_, s, _) => Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: s == SocketState.connected
                                ? TabyldyColors.success
                                : TabyldyColors.warning,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            [
                              if (conversation != null) conversation.itemTitle,
                              s == SocketState.connected
                                  ? l.connectionLive
                                  : l.connectionReconnecting,
                            ].join(' · '),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: t.textTheme.labelSmall,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          if (conversation?.claimId != null)
            IconButton(
              tooltip: l.handoffTitle,
              icon: const Icon(Icons.handshake_outlined),
              onPressed: () =>
                  context.push('/claims/${conversation!.claimId}/handoff'),
            ),
          PopupMenuButton<String>(
            onSelected: (v) => runAction(context, () async {
              if (conversation == null) return;
              if (v == 'claim' && conversation.claimId != null) {
                context.push('/claims/${conversation.claimId}');
              }
              if (v == 'report') {
                await showReportSheet(context, 'user', conversation.otherId);
              }
              if (!context.mounted) return;
              if (v == 'block' &&
                  await confirmAction(
                    context,
                    l.blockUser,
                    conversation.otherName,
                    confirmLabel: l.blockUser,
                    destructive: true,
                  )) {
                await ref
                    .read(accountRepositoryProvider)
                    .block(conversation.otherId);
                if (context.mounted) goBack(context);
              }
              if (v == 'close' &&
                  context.mounted &&
                  await confirmAction(
                    context,
                    l.closeChat,
                    conversation.itemTitle,
                    confirmLabel: l.closeChat,
                  )) {
                await ref
                    .read(messagingRepositoryProvider)
                    .close(widget.conversationId);
                ref.invalidate(conversationsProvider);
                if (context.mounted) goBack(context);
              }
            }),
            itemBuilder: (_) => [
              if (conversation?.claimId != null)
                PopupMenuItem(
                  value: 'claim',
                  child: ListTile(
                    leading: const Icon(Icons.fact_check_outlined),
                    title: Text(l.claimTitle),
                  ),
                ),
              PopupMenuItem(
                value: 'report',
                child: ListTile(
                  leading: const Icon(Icons.flag_outlined),
                  title: Text(l.report),
                ),
              ),
              PopupMenuItem(
                value: 'block',
                child: ListTile(
                  leading: const Icon(Icons.block_rounded),
                  title: Text(l.blockUser),
                ),
              ),
              PopupMenuItem(
                value: 'close',
                child: ListTile(
                  leading: const Icon(Icons.archive_outlined),
                  title: Text(l.closeChat),
                ),
              ),
            ],
          ),
        ],
      ),
      body: SoftBackground(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(Space.l, Space.s, Space.l, 0),
              child: InfoNote(
                text: '${l.safetyTip1} ${l.safetyTip2} ${l.safetyTip3}',
                icon: Icons.shield_outlined,
                color: t.colorScheme.secondary,
              ),
            ),
            Expanded(
              child: loading
                  ? const LoadingView()
                  : error != null && list.isEmpty
                  ? ErrorView(error: error!, onRetry: load)
                  : ListView.builder(
                      controller: scroll,
                      reverse: true,
                      padding: const EdgeInsets.fromLTRB(
                        Space.l,
                        Space.m,
                        Space.l,
                        Space.m,
                      ),
                      itemCount: list.length + (hasMore ? 1 : 0),
                      itemBuilder: (_, i) {
                        if (i == list.length) {
                          return Center(
                            child: TextButton(
                              onPressed: () => load(older: true),
                              child: Text(l.seeAll),
                            ),
                          );
                        }
                        final m = list[list.length - i - 1];
                        final prev = list.length - i - 2 >= 0
                            ? list[list.length - i - 2]
                            : null;
                        final showDate =
                            prev == null ||
                            !DateUtils.isSameDay(prev.createdAt, m.createdAt);
                        return Column(
                          children: [
                            if (showDate)
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 10,
                                ),
                                child: Text(
                                  _dayLabel(context, m.createdAt),
                                  style: t.textTheme.labelSmall,
                                ),
                              ),
                            _Bubble(message: m),
                          ],
                        );
                      },
                    ),
            ),
            if (closed)
              Padding(
                padding: const EdgeInsets.all(Space.l),
                child: InfoNote(
                  text: l.chatClosedBanner,
                  icon: Icons.archive_outlined,
                ),
              )
            else
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    Space.m,
                    Space.s,
                    Space.m,
                    Space.m,
                  ),
                  child: GlassPanel(
                    radius: 28,
                    padding: const EdgeInsets.fromLTRB(6, 6, 6, 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        IconButton(
                          tooltip: l.attachPhoto,
                          onPressed: uploading || sending ? null : attach,
                          icon: uploading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.add_photo_alternate_outlined),
                        ),
                        Expanded(
                          child: TextField(
                            controller: input,
                            maxLength: 2000,
                            minLines: 1,
                            maxLines: 4,
                            textCapitalization: TextCapitalization.sentences,
                            decoration: InputDecoration(
                              hintText: l.messageHint,
                              counterText: '',
                              filled: false,
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 12,
                              ),
                            ),
                            onSubmitted: (_) => send(),
                          ),
                        ),
                        IconButton.filled(
                          tooltip: l.send,
                          onPressed: sending ? null : send,
                          icon: sending
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.send_rounded),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _dayLabel(BuildContext context, DateTime d) {
    final l = context.l10n;
    final now = DateTime.now();
    if (DateUtils.isSameDay(d, now)) return l.today;
    if (DateUtils.isSameDay(d, now.subtract(const Duration(days: 1)))) {
      return l.yesterday;
    }
    return formatDate(context, d);
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});
  final Message message;
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final m = message;
    if (m.isSystem) {
      return Align(
        alignment: Alignment.center,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 320),
          margin: const EdgeInsets.symmetric(vertical: 6),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: t.colorScheme.secondaryContainer.withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                m.kind == 'handoff'
                    ? Icons.handshake_outlined
                    : Icons.shield_outlined,
                size: 16,
                color: t.colorScheme.onSecondaryContainer,
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  m.body,
                  style: t.textTheme.bodySmall?.copyWith(
                    color: t.colorScheme.onSecondaryContainer,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }
    final mine = m.mine;
    final radius = BorderRadius.only(
      topLeft: const Radius.circular(20),
      topRight: const Radius.circular(20),
      bottomLeft: Radius.circular(mine ? 20 : 6),
      bottomRight: Radius.circular(mine ? 6 : 20),
    );
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 320),
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
        decoration: BoxDecoration(
          color: mine ? t.colorScheme.primary : t.colorScheme.surface,
          borderRadius: radius,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (m.attachmentUrl != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    width: 220,
                    height: 160,
                    child: NetImage(url: m.attachmentUrl!),
                  ),
                ),
              ),
            if (m.body.isNotEmpty)
              Text(
                m.body,
                style: t.textTheme.bodyLarge?.copyWith(
                  color: mine ? Colors.white : t.colorScheme.onSurface,
                ),
              ),
            for (final w in m.warnings)
              Container(
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: TabyldyColors.warning.withValues(
                    alpha: mine ? 0.3 : 0.14,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.warning_amber_rounded,
                      size: 16,
                      color: mine ? Colors.white : TabyldyColors.warning,
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        Labels.warning(l, w),
                        style: t.textTheme.labelSmall?.copyWith(
                          color: mine ? Colors.white : t.colorScheme.onSurface,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 4),
            Text(
              formatTime(context, m.createdAt),
              style: t.textTheme.labelSmall?.copyWith(
                color: mine ? Colors.white.withValues(alpha: 0.8) : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
