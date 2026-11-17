import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../core/theme/tokens.dart';
import '../../shared/motion.dart';
import '../../core/theme/glass.dart';
import '../../shared/widgets.dart';
import '../common.dart';
import '../item/item_detail_screen.dart';

final claimProvider = FutureProvider.autoDispose.family<Claim, String>(
  (ref, id) => ref.watch(claimsRepositoryProvider).get(id),
);

/// Claim detail for both sides. The owner compares evidence with hidden features and
/// decides; the claimant follows the status, adds details or withdraws (PRD §13).
class ClaimDetailScreen extends ConsumerStatefulWidget {
  const ClaimDetailScreen({super.key, required this.claimId});
  final String claimId;
  @override
  ConsumerState<ClaimDetailScreen> createState() => _ClaimDetailState();
}

class _ClaimDetailState extends ConsumerState<ClaimDetailScreen> {
  final note = TextEditingController();
  bool busy = false;

  @override
  void dispose() {
    note.dispose();
    super.dispose();
  }

  Future<void> act(Future<Claim> Function() fn) async {
    setState(() => busy = true);
    await runAction(context, () async {
      await fn();
      note.clear();
      ref.invalidate(claimProvider(widget.claimId));
    });
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final repo = ref.read(claimsRepositoryProvider);
    final value = ref.watch(claimProvider(widget.claimId));
    final claim = value.value;
    return Scaffold(
      appBar: AppBar(
        title: Text(l.claimTitle),
        actions: [IconButton(tooltip: l.retry, icon: const Icon(Icons.refresh_rounded), onPressed: () => ref.invalidate(claimProvider(widget.claimId)))],
      ),
      body: AsyncBody(
        value: value,
        retry: () => ref.invalidate(claimProvider(widget.claimId)),
        builder: (claim) => ListView(
          padding: const EdgeInsets.fromLTRB(Space.xl, Space.s, Space.xl, 160),
          children: [
            Card(
              child: ListTile(
                leading: Icon(claim.itemType == 'LOST' ? Icons.search_rounded : Icons.inventory_2_rounded, color: listingTypeColor(claim.itemType)),
                title: Text(claim.itemTitle, style: t.textTheme.titleMedium),
                subtitle: Text(claim.kind == 'OWNERSHIP' ? l.thisIsMine : l.maybeIFoundIt),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => context.push('/items/${claim.itemId}'),
              ),
            ),
            const SizedBox(height: Space.m),
            Row(
              children: [
                Text(l.claimStatusLabel, style: t.textTheme.labelSmall),
                const SizedBox(width: 8),
                StatusChip(label: Labels.claimStatus(l, claim.status), color: claimStatusColor(claim.status)),
              ],
            ),
            const SizedBox(height: Space.s),
            Text('${l.claimantLabel}: ${claim.claimantName} · ${Labels.relativeTime(l, claim.submittedAt)}', style: t.textTheme.bodySmall),
            if (claim.message != null && claim.message!.isNotEmpty) ...[
              const SizedBox(height: Space.m),
              Text(claim.message!, style: t.textTheme.bodyLarge),
            ],
            if (claim.decisionNote != null && claim.decisionNote!.isNotEmpty) ...[
              const SizedBox(height: Space.m),
              InfoNote(title: l.decisionNote, text: claim.decisionNote!, icon: Icons.rate_review_outlined),
            ],
            if (claim.isClaimant && claim.contactPhone != null) ...[
              const SizedBox(height: Space.m),
              FadeSlideIn(
                child: GlassPanel(
                  child: Row(
                    children: [
                      const Icon(Icons.phone_in_talk_rounded, color: TabyldyColors.success),
                      const SizedBox(width: Space.m),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(l.contactPhoneTitle, style: t.textTheme.labelSmall),
                            SelectableText(claim.contactPhone!, style: t.textTheme.titleLarge),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip: l.copyPhone,
                        icon: const Icon(Icons.copy_rounded),
                        onPressed: () async {
                          await Clipboard.setData(ClipboardData(text: claim.contactPhone!));
                          if (context.mounted) showSnack(context, l.phoneCopied);
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ],
            if (claim.isClaimant) ...[
              const SizedBox(height: Space.m),
              InfoNote(text: claim.intro, icon: Icons.shield_outlined),
            ],
            const SizedBox(height: Space.xl),
            Text(l.evidenceFromClaimant, style: t.textTheme.titleMedium),
            const SizedBox(height: Space.s),
            for (final e in claim.evidence)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(Space.m),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.verified_outlined, size: 18, color: t.colorScheme.primary),
                          const SizedBox(width: 6),
                          Text(Labels.evidenceType(l, e.type), style: t.textTheme.titleMedium?.copyWith(fontSize: 14)),
                          const Spacer(),
                          Text(Labels.relativeTime(l, e.createdAt), style: t.textTheme.labelSmall),
                        ],
                      ),
                      if (e.text != null && e.text!.isNotEmpty) ...[const SizedBox(height: 6), Text(e.text!)],
                      if (e.attachmentUrl != null) ...[
                        const SizedBox(height: Space.s),
                        ClipRRect(borderRadius: BorderRadius.circular(14), child: SizedBox(height: 180, width: double.infinity, child: NetImage(url: e.attachmentUrl!))),
                      ],
                    ],
                  ),
                ),
              ),
            if (claim.isItemOwner) ...[
              const SizedBox(height: Space.m),
              AsyncBody(
                value: ref.watch(itemProvider(claim.itemId)),
                loading: const SizedBox.shrink(),
                builder: (item) => (item.hiddenFeatures?.isEmpty ?? true)
                    ? const SizedBox.shrink()
                    : InfoNote(title: l.yourHiddenFeatures, text: item.hiddenFeatures!.map((f) => '• $f').join('\n'), icon: Icons.lock_outline_rounded, color: t.colorScheme.tertiary),
              ),
            ],
            if (claim.isClaimant && claim.status == 'NEEDS_MORE_INFORMATION') ...[
              const SizedBox(height: Space.xl),
              Text(l.addEvidence, style: t.textTheme.titleMedium),
              const SizedBox(height: Space.s),
              TextField(controller: note, maxLength: 600, maxLines: 3, decoration: InputDecoration(labelText: l.evidenceText, hintText: l.evidenceHint)),
              BusyButton(
                label: l.addEvidence,
                icon: Icons.add_rounded,
                busy: busy,
                tonal: true,
                onPressed: () {
                  if (note.text.trim().isNotEmpty) {
                    act(() => repo.addEvidence(claim.id, [
                      {'type': 'other', 'text': note.text.trim()},
                    ]));
                  }
                },
              ),
            ],
            const SizedBox(height: Space.xl),
            Wrap(
              spacing: Space.s,
              runSpacing: Space.s,
              children: [
                if (claim.isClaimant && claim.isActive)
                  OutlinedButton.icon(
                    onPressed: busy ? null : () => act(() => repo.withdraw(claim.id)),
                    icon: const Icon(Icons.undo_rounded, size: 18),
                    label: Text(l.withdrawClaim),
                  ),
                if (claim.status != 'COMPLETED' && claim.status != 'UNDER_REVIEW' && claim.status != 'WITHDRAWN')
                  OutlinedButton.icon(
                    onPressed: busy
                        ? null
                        : () async {
                            if (await confirmAction(context, l.dispute, l.claimStatusUnderReview, confirmLabel: l.dispute)) act(() => repo.dispute(claim.id));
                          },
                    icon: const Icon(Icons.gavel_rounded, size: 18),
                    label: Text(l.dispute),
                  ),
              ],
            ),
          ],
        ),
      ),
      bottomNavigationBar: claim == null ? null : _Actions(claim: claim, note: note, busy: busy, act: act),
    );
  }
}

class _Actions extends ConsumerWidget {
  const _Actions({required this.claim, required this.note, required this.busy, required this.act});
  final Claim claim;
  final TextEditingController note;
  final bool busy;
  final Future<void> Function(Future<Claim> Function()) act;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final repo = ref.read(claimsRepositoryProvider);
    final chatOrHandoff = <Widget>[
      if (claim.conversationId != null)
        Expanded(child: FilledButton.icon(onPressed: () => context.push('/conversations/${claim.conversationId}'), icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18), label: Text(l.openChat))),
      if (['PLAUSIBLE', 'APPROVED_FOR_HANDOFF', 'COMPLETED'].contains(claim.status)) ...[
        if (claim.conversationId != null) const SizedBox(width: Space.s),
        Expanded(child: OutlinedButton.icon(onPressed: () => context.push('/claims/${claim.id}/handoff'), icon: const Icon(Icons.handshake_outlined, size: 18), label: Text(l.handoffTitle))),
      ],
    ];
    final canDecide = claim.isItemOwner && claim.isActive && claim.status != 'UNDER_REVIEW' && claim.status != 'APPROVED_FOR_HANDOFF' && claim.status != 'PLAUSIBLE';
    if (!canDecide && chatOrHandoff.isEmpty) return const SizedBox.shrink();
    return GlassActionBar(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (chatOrHandoff.isNotEmpty) Row(children: chatOrHandoff),
          if (canDecide) ...[
            if (chatOrHandoff.isNotEmpty) const SizedBox(height: Space.s),
            TextField(controller: note, maxLength: 400, decoration: InputDecoration(labelText: l.decisionNote, counterText: ''), enabled: !busy),
            const SizedBox(height: Space.s),
            Row(
              children: [
                Expanded(
                  child: BusyButton(label: l.decisionPlausible, icon: Icons.thumb_up_alt_outlined, busy: busy, onPressed: () => act(() => repo.decide(claim.id, 'plausible', note: note.text))),
                ),
              ],
            ),
            const SizedBox(height: Space.s),
            Row(
              children: [
                Expanded(child: OutlinedButton(onPressed: busy ? null : () => act(() => repo.decide(claim.id, 'needs_more_information', note: note.text)), child: Text(l.decisionNeedsInfo))),
                const SizedBox(width: Space.s),
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
                    onPressed: busy ? null : () => act(() => repo.decide(claim.id, 'rejected', note: note.text)),
                    child: Text(l.decisionReject),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
