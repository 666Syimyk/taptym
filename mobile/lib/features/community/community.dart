import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/router.dart';
import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';
import '../common.dart';
import '../profile/report_sheet.dart';

/// A public comment under a listing.
class ItemComment {
  const ItemComment({
    required this.id,
    required this.body,
    required this.authorName,
    required this.authorTrust,
    required this.byItemOwner,
    required this.isMine,
    required this.canDelete,
    required this.createdAt,
  });
  final String id, body, authorName, authorTrust;
  final bool byItemOwner, isMine, canDelete;
  final DateTime createdAt;

  factory ItemComment.fromJson(Map<String, dynamic> j) {
    final author = Map<String, dynamic>.from(j['author'] as Map);
    return ItemComment(
      id: j['id'] as String,
      body: j['body'] as String,
      authorName: (author['publicName'] as String?) ?? '',
      authorTrust: (author['trustLevel'] as String?) ?? 'Guest',
      byItemOwner: j['byItemOwner'] == true,
      isMine: j['isMine'] == true,
      canDelete: j['canDelete'] == true,
      createdAt: DateTime.parse(j['createdAt'] as String).toLocal(),
    );
  }
}

class CommunityRepository {
  CommunityRepository(this._api);
  final ApiClient _api;

  Future<List<ItemComment>> comments(String itemId) async {
    final data = await _api.get<List<dynamic>>('/v1/items/$itemId/comments');
    return data.map((e) => ItemComment.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<void> addComment(String itemId, String body) =>
      _api.post<Map<String, dynamic>>('/v1/items/$itemId/comments', data: {'body': body});

  Future<void> deleteComment(String id) => _api.delete<void>('/v1/comments/$id');

  Future<void> sendFeedback({required String kind, required String message, int? rating, String? contact}) =>
      _api.post<Map<String, dynamic>>(
        '/v1/feedback',
        data: {
          'kind': kind,
          'message': message,
          'rating': ?rating,
          if (contact != null && contact.trim().isNotEmpty) 'contact': contact.trim(),
          'platform': kIsWeb ? 'web' : defaultTargetPlatform.name,
        },
      );
}

final communityRepositoryProvider = Provider((ref) => CommunityRepository(ref.watch(apiClientProvider)));

final commentsProvider = FutureProvider.autoDispose.family<List<ItemComment>, String>(
  (ref, itemId) => ref.watch(communityRepositoryProvider).comments(itemId),
);

/// Comments block on the listing page: tips from anyone who saw the item.
class CommentsSection extends ConsumerStatefulWidget {
  const CommentsSection({super.key, required this.item});
  final Item item;
  @override
  ConsumerState<CommentsSection> createState() => _CommentsSectionState();
}

class _CommentsSectionState extends ConsumerState<CommentsSection> {
  final _text = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final body = _text.text.trim();
    if (body.isEmpty || _sending) return;
    setState(() => _sending = true);
    await requireAuth(context, ref, () async {
      await runAction(context, () async {
        await ref.read(communityRepositoryProvider).addComment(widget.item.id, body);
        _text.clear();
        if (mounted) FocusScope.of(context).unfocus();
      });
    });
    ref.invalidate(commentsProvider(widget.item.id));
    if (mounted) setState(() => _sending = false);
  }

  Future<void> _delete(ItemComment c) async {
    final l = context.l10n;
    if (!await confirmAction(context, l.commentDelete, c.body, confirmLabel: l.delete, destructive: true)) return;
    if (!mounted) return;
    await runAction(context, () async {
      await ref.read(communityRepositoryProvider).deleteComment(c.id);
      if (mounted) showSnack(context, l.commentDeleted);
    });
    ref.invalidate(commentsProvider(widget.item.id));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final value = ref.watch(commentsProvider(widget.item.id));
    final list = value.value ?? const <ItemComment>[];
    final open = widget.item.status == 'PUBLISHED';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(list.isEmpty ? l.commentsTitle : l.commentsCount(list.length), style: t.textTheme.titleMedium),
        const SizedBox(height: Space.s),
        if (value.isLoading && value.value == null)
          const Padding(
            padding: EdgeInsets.all(Space.l),
            child: Center(child: CircularProgressIndicator.adaptive()),
          )
        else if (value.hasError && value.value == null)
          TextButton.icon(
            onPressed: () => ref.invalidate(commentsProvider(widget.item.id)),
            icon: const Icon(Icons.refresh_rounded),
            label: Text(l.retry),
          )
        else if (list.isEmpty)
          Text(l.commentsEmpty, style: t.textTheme.bodyMedium?.copyWith(color: t.colorScheme.onSurfaceVariant))
        else
          Card(
            child: Column(
              children: [
                for (final (i, c) in list.indexed) ...[
                  if (i > 0) const Divider(height: 1),
                  _CommentTile(
                    comment: c,
                    onDelete: c.canDelete ? () => _delete(c) : null,
                    onReport: c.isMine
                        ? null
                        : () => requireAuth(context, ref, () async => showReportSheet(context, 'comment', c.id)),
                  ),
                ],
              ],
            ),
          ),
        const SizedBox(height: Space.m),
        if (open) ...[
          TextField(
            controller: _text,
            minLines: 1,
            maxLines: 4,
            maxLength: 500,
            textCapitalization: TextCapitalization.sentences,
            textInputAction: TextInputAction.newline,
            decoration: InputDecoration(
              hintText: l.commentHint,
              counterText: '',
              suffixIcon: IconButton(
                tooltip: l.send,
                onPressed: _sending ? null : _send,
                icon: _sending
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.send_rounded),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(l.commentRules, style: t.textTheme.bodySmall),
        ] else
          Text(l.commentsClosed, style: t.textTheme.bodySmall),
      ],
    );
  }
}

class _CommentTile extends StatelessWidget {
  const _CommentTile({required this.comment, this.onDelete, this.onReport});
  final ItemComment comment;
  final VoidCallback? onDelete, onReport;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final name = comment.authorName.isEmpty ? l.trustGuest : comment.authorName;
    return Padding(
      padding: const EdgeInsets.fromLTRB(Space.l, Space.m, 4, Space.m),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InitialAvatar(name: name, size: 36),
          const SizedBox(width: Space.m),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(name, style: t.textTheme.titleSmall),
                    if (comment.byItemOwner) StatusChip(label: l.commentByOwner, color: t.colorScheme.secondary),
                    Text(Labels.relativeTime(l, comment.createdAt), style: t.textTheme.bodySmall),
                  ],
                ),
                const SizedBox(height: 4),
                Text(comment.body, style: t.textTheme.bodyMedium),
              ],
            ),
          ),
          if (onDelete != null || onReport != null)
            PopupMenuButton<String>(
              tooltip: l.moreActions,
              icon: const Icon(Icons.more_vert_rounded, size: 20),
              onSelected: (v) => v == 'delete' ? onDelete?.call() : onReport?.call(),
              itemBuilder: (_) => [
                if (onDelete != null)
                  PopupMenuItem(
                    value: 'delete',
                    child: ListTile(leading: const Icon(Icons.delete_outline_rounded), title: Text(l.commentDelete)),
                  ),
                if (onReport != null)
                  PopupMenuItem(
                    value: 'report',
                    child: ListTile(leading: const Icon(Icons.flag_outlined), title: Text(l.report)),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

/// "Contact us": ideas, problems and thanks go straight to the team's panel.
class FeedbackScreen extends ConsumerStatefulWidget {
  const FeedbackScreen({super.key});
  @override
  ConsumerState<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends ConsumerState<FeedbackScreen> {
  final _form = GlobalKey<FormState>();
  final _message = TextEditingController();
  final _contact = TextEditingController();
  String _kind = 'idea';
  int? _rating;
  bool _sending = false;

  @override
  void dispose() {
    _message.dispose();
    _contact.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_sending || !_form.currentState!.validate()) return;
    setState(() => _sending = true);
    final l = context.l10n;
    await runAction(context, () async {
      await ref.read(communityRepositoryProvider).sendFeedback(
        kind: _kind,
        message: _message.text.trim(),
        rating: _rating,
        contact: _contact.text,
      );
      if (!mounted) return;
      showSnack(context, l.feedbackSent);
      goBack(context);
    });
    if (mounted) setState(() => _sending = false);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final kinds = {
      'idea': (l.feedbackIdea, Icons.lightbulb_outline_rounded),
      'problem': (l.feedbackProblem, Icons.bug_report_outlined),
      'praise': (l.feedbackPraise, Icons.favorite_border_rounded),
      'question': (l.feedbackQuestion, Icons.help_outline_rounded),
      'other': (l.feedbackOther, Icons.more_horiz_rounded),
    };
    return Scaffold(
      appBar: AppBar(title: Text(l.contactUs)),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Space.xl, Space.s, Space.xl, Space.xxxl),
          children: [
            Text(l.feedbackIntro, style: t.textTheme.bodyLarge),
            const SizedBox(height: Space.xl),
            Text(l.feedbackKind, style: t.textTheme.titleMedium),
            const SizedBox(height: Space.s),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final MapEntry(key: k, value: (label, icon)) in kinds.entries)
                  ChoiceChip(
                    avatar: Icon(icon, size: 18),
                    label: Text(label),
                    selected: _kind == k,
                    onSelected: (_) => setState(() => _kind = k),
                  ),
              ],
            ),
            const SizedBox(height: Space.xl),
            Text(l.feedbackRating, style: t.textTheme.titleMedium),
            Row(
              children: [
                for (var i = 1; i <= 5; i++)
                  IconButton(
                    tooltip: '$i',
                    onPressed: () => setState(() => _rating = _rating == i ? null : i),
                    icon: Icon(
                      (_rating ?? 0) >= i ? Icons.star_rounded : Icons.star_outline_rounded,
                      color: (_rating ?? 0) >= i ? TabyldyColors.warning : t.colorScheme.onSurfaceVariant,
                      size: 32,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: Space.l),
            TextFormField(
              controller: _message,
              minLines: 4,
              maxLines: 8,
              maxLength: 2000,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(labelText: l.feedbackMessage, hintText: l.feedbackMessageHint, alignLabelWithHint: true),
              validator: (v) => (v ?? '').trim().length < 3 ? l.feedbackMessageRequired : null,
            ),
            const SizedBox(height: Space.m),
            TextFormField(
              controller: _contact,
              maxLength: 120,
              decoration: InputDecoration(labelText: l.feedbackContact, hintText: l.feedbackContactHint, counterText: ''),
            ),
            const SizedBox(height: Space.xl),
            FilledButton.icon(
              onPressed: _sending ? null : _submit,
              icon: _sending
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.send_rounded),
              label: Text(l.send),
            ),
          ],
        ),
      ),
    );
  }
}
