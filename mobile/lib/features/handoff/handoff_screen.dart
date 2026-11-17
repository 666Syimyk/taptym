import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';
import '../common.dart';

final handoffProvider = FutureProvider.autoDispose.family<Handoff?, String>(
  (ref, id) => ref.watch(handoffsRepositoryProvider).forClaim(id),
);

/// Handoff screen (PRD §8.13 / §15): item, confirmation state timeline, instructions,
/// agreed method, one-time code for the holder, confirmation button.
class HandoffScreen extends ConsumerStatefulWidget {
  const HandoffScreen({super.key, required this.claimId});
  final String claimId;
  @override
  ConsumerState<HandoffScreen> createState() => _HandoffState();
}

class _HandoffState extends ConsumerState<HandoffScreen> {
  final place = TextEditingController(), code = TextEditingController();
  String method = 'meeting';
  bool busy = false;
  String? holderCode;

  @override
  void dispose() {
    place.dispose();
    code.dispose();
    super.dispose();
  }

  Future<void> act(Future<Handoff> Function() fn) async {
    setState(() => busy = true);
    await runAction(context, () async {
      final result = await fn();
      if (mounted && result.confirmationCode != null) setState(() => holderCode = result.confirmationCode);
      ref.invalidate(handoffProvider(widget.claimId));
    });
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final repo = ref.read(handoffsRepositoryProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.handoffTitle),
        actions: [IconButton(tooltip: l.retry, icon: const Icon(Icons.refresh_rounded), onPressed: () => ref.invalidate(handoffProvider(widget.claimId)))],
      ),
      body: AsyncBody(
        value: ref.watch(handoffProvider(widget.claimId)),
        retry: () => ref.invalidate(handoffProvider(widget.claimId)),
        builder: (handoff) => ListView(
          padding: const EdgeInsets.fromLTRB(Space.xl, Space.s, Space.xl, Space.xxxl),
          children: [
            InfoNote(title: l.safetyTipsTitle, text: '${l.safetyTip3}\n${l.safetyTip1}', icon: Icons.handshake_outlined, color: t.colorScheme.secondary),
            const SizedBox(height: Space.xl),
            if (handoff == null) ...[
              Text(l.handoffPropose, style: t.textTheme.headlineSmall),
              const SizedBox(height: Space.m),
              SegmentedButton<String>(
                segments: [
                  ButtonSegment(value: 'meeting', icon: const Icon(Icons.people_outline_rounded), label: Text(l.handoffMethodMeeting)),
                  ButtonSegment(value: 'other', icon: const Icon(Icons.more_horiz_rounded), label: Text(l.handoffMethodOther)),
                ],
                selected: {method},
                onSelectionChanged: (s) => setState(() => method = s.first),
              ),
              const SizedBox(height: Space.l),
              TextField(controller: place, maxLength: 200, decoration: InputDecoration(labelText: l.handoffPlaceHint, prefixIcon: const Icon(Icons.place_outlined))),
              const SizedBox(height: Space.s),
              BusyButton(label: l.handoffCreate, icon: Icons.send_rounded, busy: busy, onPressed: () => act(() => repo.create(widget.claimId, method: method, placeNote: place.text))),
            ] else ...[
              Text(handoff.itemTitle, style: t.textTheme.headlineSmall),
              if (handoff.placeNote != null) ...[
                const SizedBox(height: 6),
                Row(children: [const Icon(Icons.place_outlined, size: 18), const SizedBox(width: 6), Expanded(child: Text(handoff.placeNote!))]),
              ],
              const SizedBox(height: Space.xl),
              _Timeline(handoff: handoff),
              const SizedBox(height: Space.xl),
              if (handoff.completed)
                InfoNote(text: l.handoffCompleted, icon: Icons.check_circle_rounded, color: TabyldyColors.success)
              else if (handoff.state == 'DISPUTED')
                InfoNote(text: l.claimStatusUnderReview, icon: Icons.gavel_rounded, color: TabyldyColors.warning)
              else ...[
                if (handoff.isHolder && (holderCode ?? handoff.confirmationCode) != null) ...[
                  Text(l.handoffCodeTitle, style: t.textTheme.titleMedium),
                  const SizedBox(height: Space.s),
                  _CodeBoxes(code: (holderCode ?? handoff.confirmationCode)!),
                  const SizedBox(height: Space.s),
                  Text(l.handoffCodeHolder, style: t.textTheme.bodySmall),
                  if (handoff.expiresAt != null) Text(l.handoffCodeExpires(formatDate(context, handoff.expiresAt!)), style: t.textTheme.labelSmall),
                  const SizedBox(height: Space.l),
                ],
                if (!handoff.isHolder && !handoff.iConfirmed) ...[
                  Text(l.handoffCodeReceiver, style: t.textTheme.titleMedium),
                  const SizedBox(height: Space.s),
                  TextField(
                    controller: code,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
                    textAlign: TextAlign.center,
                    style: t.textTheme.displaySmall?.copyWith(letterSpacing: 10),
                    decoration: const InputDecoration(hintText: '••••••', counterText: ''),
                  ),
                  const SizedBox(height: Space.l),
                ],
                if (handoff.iConfirmed)
                  InfoNote(text: l.handoffWaiting, icon: Icons.hourglass_top_rounded)
                else
                  BusyButton(label: l.handoffConfirm, icon: Icons.check_rounded, busy: busy, onPressed: () => act(() => repo.confirm(handoff.id, code: code.text.trim()))),
                const SizedBox(height: Space.s),
                TextButton.icon(
                  onPressed: busy
                      ? null
                      : () async {
                          if (await confirmAction(context, l.dispute, l.claimStatusUnderReview, confirmLabel: l.dispute)) act(() => repo.dispute(handoff.id));
                        },
                  icon: const Icon(Icons.gavel_rounded, size: 18),
                  label: Text(l.dispute),
                ),
              ],
              const SizedBox(height: Space.l),
              InfoNote(text: handoff.disclaimer.isEmpty ? l.handoffDisclaimer : handoff.disclaimer, icon: Icons.info_outline_rounded),
            ],
          ],
        ),
      ),
    );
  }
}

class _Timeline extends StatelessWidget {
  const _Timeline({required this.handoff});
  final Handoff handoff;
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final steps = [
      (l.handoffStep1, true),
      (l.handoffStep2, handoff.iConfirmed || handoff.completed),
      (l.handoffStep3, handoff.otherConfirmed || handoff.completed),
      (l.handoffStep4, handoff.completed),
    ];
    return GlassPanel(
      child: Column(
        children: [
          for (final (i, (label, done)) in steps.indexed)
            Row(
              children: [
                Column(
                  children: [
                    Container(
                      width: 26,
                      height: 26,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: done ? TabyldyColors.success : t.colorScheme.surfaceContainerHighest,
                        border: Border.all(color: done ? TabyldyColors.success : t.colorScheme.outline),
                      ),
                      child: done ? const Icon(Icons.check_rounded, size: 16, color: Colors.white) : null,
                    ),
                    if (i < steps.length - 1) Container(width: 2, height: 22, color: done ? TabyldyColors.success : t.colorScheme.outline),
                  ],
                ),
                const SizedBox(width: Space.m),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(bottom: i < steps.length - 1 ? 22 : 0),
                    child: Text(label, style: t.textTheme.bodyLarge?.copyWith(fontWeight: done ? FontWeight.w700 : FontWeight.w400)),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _CodeBoxes extends StatelessWidget {
  const _CodeBoxes({required this.code});
  final String code;
  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Semantics(
      label: code.split('').join(' '),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (final ch in code.split(''))
            Container(
              width: 44,
              height: 56,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: t.colorScheme.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: t.colorScheme.primary.withValues(alpha: 0.4)),
              ),
              child: Text(ch, style: t.textTheme.headlineMedium),
            ),
        ],
      ),
    );
  }
}
