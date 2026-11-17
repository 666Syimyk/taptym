import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';
import '../common.dart';
import '../community/community.dart';
import '../listing/listing_wizard.dart';
import '../profile/report_sheet.dart';

final itemProvider = FutureProvider.autoDispose.family<Item, String>(
  (ref, id) => ref.watch(itemsRepositoryProvider).detail(id),
);

/// Item detail (PRD §8.7): gallery, title, status, category, description, date, area,
/// visible characteristics, owner info level, main action, report, share.
class ItemDetailScreen extends ConsumerWidget {
  const ItemDetailScreen({super.key, required this.itemId});
  final String itemId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(itemProvider(itemId));
    void refresh() => ref.invalidate(itemProvider(itemId));
    return Scaffold(
      body: value.when(
        loading: () => const Center(child: CircularProgressIndicator.adaptive()),
        error: (e, _) => SafeArea(
          child: Column(
            children: [
              Align(alignment: Alignment.centerLeft, child: BackButton(onPressed: () => goBack(context))),
              Expanded(child: ErrorView(error: e, onRetry: refresh)),
            ],
          ),
        ),
        data: (item) => _Body(item: item, refresh: refresh),
      ),
      bottomNavigationBar: value.value == null ? null : _ActionBar(item: value.value!, refresh: refresh),
    );
    // ignore: dead_code
    return const SizedBox.shrink();
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.item, required this.refresh});
  final Item item;
  final VoidCallback refresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final t = Theme.of(context);
    final loc = context.localeCode;
    final hasPhotos = item.media.any((m) => m.publicUrl != null);
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          expandedHeight: hasPhotos ? 320 : 120,
          backgroundColor: t.scaffoldBackgroundColor,
          leading: Padding(
            padding: const EdgeInsets.all(6),
            child: BadgeIconButton(icon: Icons.arrow_back_rounded, tooltip: l.back, onPressed: () => goBack(context)),
          ),
          actions: [
            BadgeIconButton(
              icon: Icons.ios_share_rounded,
              tooltip: l.share,
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: 'tabyldy://items/${item.id}'));
                if (context.mounted) showSnack(context, l.linkCopied);
              },
            ),
            const SizedBox(width: 6),
            BadgeIconButton(
              icon: Icons.flag_outlined,
              tooltip: l.report,
              onPressed: () => requireAuth(context, ref, () async => showReportSheet(context, 'item', item.id)),
            ),
            const SizedBox(width: 12),
          ],
          flexibleSpace: FlexibleSpaceBar(
            background: hasPhotos ? _Gallery(media: item.media.where((m) => m.publicUrl != null).toList()) : _IconHero(item: item),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(Space.xl, Space.l, Space.xl, 140),
          sliver: SliverList.list(
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  StatusChip(label: item.isLost ? l.lostLabel : l.foundLabel, color: listingTypeColor(item.listingType), icon: item.isLost ? Icons.search_rounded : Icons.inventory_2_rounded),
                  StatusChip(label: Labels.itemStatus(l, item.status), color: statusColor(item.status)),
                  if (item.reward != null)
                    StatusChip(label: item.reward!.amount != null ? l.rewardAmount('${item.reward!.amount}') : l.reward, color: TabyldyColors.accentMint, icon: Icons.card_giftcard_rounded),
                ],
              ),
              const SizedBox(height: Space.m),
              Text(item.title, style: t.textTheme.headlineMedium),
              const SizedBox(height: 6),
              Text(
                [item.category.name(loc), Labels.relativeTime(l, item.publishedAt ?? item.createdAt)].join(' · '),
                style: t.textTheme.bodySmall,
              ),
              if (item.isOwner && item.status == 'PENDING_REVIEW') ...[
                const SizedBox(height: Space.m),
                InfoNote(text: l.statusHintPending, icon: Icons.pending_actions_rounded, color: TabyldyColors.warning),
              ],
              if (item.moderationNote != null) ...[
                const SizedBox(height: Space.m),
                InfoNote(text: item.moderationNote!, icon: Icons.rate_review_outlined, color: TabyldyColors.warning),
              ],
              if (item.description.isNotEmpty) ...[
                const SizedBox(height: Space.xl),
                Text(l.description, style: t.textTheme.titleMedium),
                const SizedBox(height: 6),
                Text(item.description, style: t.textTheme.bodyLarge),
              ],
              const SizedBox(height: Space.xl),
              Text(l.visibleFeatures, style: t.textTheme.titleMedium),
              const SizedBox(height: 4),
              Card(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: Space.l, vertical: 4),
                  child: Column(
                    children: [
                      SpecRow(icon: Labels.categoryIcon(item.category.icon), label: l.category, value: item.category.name(loc)),
                      if (item.color != null) SpecRow(icon: Icons.palette_outlined, label: l.color, value: Labels.color(l, item.color), leading: ColorDot(colorKey: item.color!)),
                      if (item.brand != null) SpecRow(icon: Icons.sell_outlined, label: l.brand, value: item.brand!),
                      if (item.size != null) SpecRow(icon: Icons.straighten_rounded, label: l.size, value: item.size!),
                      if (item.eventTimeStart != null) SpecRow(icon: Icons.calendar_today_outlined, label: l.date, value: formatDate(context, item.eventTimeStart!)),
                      if (item.location != null) SpecRow(icon: Icons.place_outlined, label: l.approximateArea, value: item.location!.label(loc)),
                    ],
                  ),
                ),
              ),
              if (item.reward != null) ...[
                const SizedBox(height: Space.m),
                InfoNote(
                  title: l.reward,
                  text: [if (item.reward!.amount != null) l.rewardAmount('${item.reward!.amount}'), if (item.reward!.note != null) item.reward!.note!, l.rewardDisclaimer].join('\n'),
                  icon: Icons.card_giftcard_rounded,
                  color: TabyldyColors.accentMint,
                ),
              ],
              if (Labels.sensitiveHint(l, item.category) != null) ...[
                const SizedBox(height: Space.m),
                InfoNote(title: l.sensitiveCategoryTitle, text: Labels.sensitiveHint(l, item.category)!, icon: Icons.lock_outline_rounded, color: TabyldyColors.warning),
              ],
              const SizedBox(height: Space.xl),
              Text(l.postedBy, style: t.textTheme.titleMedium),
              const SizedBox(height: 4),
              Card(
                child: ListTile(
                  leading: InitialAvatar(name: item.owner.publicName),
                  title: Text(item.owner.publicName.isEmpty ? l.trustGuest : item.owner.publicName),
                  subtitle: Text(Labels.trust(l, item.owner.trustLevel)),
                  trailing: Icon(item.owner.trustLevel == 'EstablishedAccount' ? Icons.verified_rounded : Icons.verified_user_outlined, color: t.colorScheme.secondary),
                ),
              ),
              const SizedBox(height: Space.s),
              Text(l.contactHidden, style: t.textTheme.bodySmall),
              if (item.isOwner) ...[
                const SizedBox(height: Space.xl),
                Text(l.ownerPanelTitle, style: t.textTheme.titleMedium),
                const SizedBox(height: 4),
                Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.join_inner_rounded),
                        title: Text(l.viewMatches),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => context.push('/items/${item.id}/matches'),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.fact_check_outlined),
                        title: Text(l.viewClaims),
                        trailing: item.pendingClaims > 0 ? StatusChip(label: l.pendingClaimsCount(item.pendingClaims)) : const Icon(Icons.chevron_right_rounded),
                        onTap: () => context.push('/items/${item.id}/claims'),
                      ),
                      if (item.hiddenFeatures?.isNotEmpty == true) ...[
                        const Divider(height: 1),
                        ListTile(
                          leading: const Icon(Icons.lock_outline_rounded),
                          title: Text(l.hiddenFeaturesTitle),
                          subtitle: Text(item.hiddenFeatures!.join(' · ')),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
              if (['PUBLISHED', 'RESOLVED'].contains(item.status)) ...[
                const SizedBox(height: Space.xl),
                CommentsSection(item: item),
              ],
              const SizedBox(height: Space.xl),
              InfoNote(title: l.safetyTipsTitle, text: '${l.safetyTip1}\n${l.safetyTip2}\n${l.safetyTip3}', icon: Icons.shield_outlined, color: t.colorScheme.secondary),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActionBar extends ConsumerWidget {
  const _ActionBar({required this.item, required this.refresh});
  final Item item;
  final VoidCallback refresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    if (item.isOwner) {
      final active = !['CLOSED', 'RESOLVED', 'REMOVED'].contains(item.status);
      return GlassActionBar(
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: !active
                    ? null
                    : () async {
                        final changed = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => ListingWizard(type: item.listingType, item: item), fullscreenDialog: true));
                        if (changed == true) refresh();
                      },
                icon: const Icon(Icons.edit_outlined, size: 18),
                label: Text(l.edit),
              ),
            ),
            const SizedBox(width: Space.s),
            Expanded(
              child: FilledButton.icon(
                onPressed: !active
                    ? null
                    : () => runAction(context, () async {
                        if (await confirmAction(context, l.markResolved, l.handoffDisclaimer, confirmLabel: l.markResolved)) {
                          await ref.read(itemsRepositoryProvider).close(item.id, 'resolved');
                          refresh();
                        }
                      }),
                icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
                label: Text(l.markResolved),
              ),
            ),
            const SizedBox(width: Space.s),
            PopupMenuButton<String>(
              tooltip: l.moreActions,
              icon: const Icon(Icons.more_horiz_rounded),
              onSelected: (v) => runAction(context, () async {
                if (v == 'close' && await confirmAction(context, l.closeListing, item.title, confirmLabel: l.closeListing)) {
                  await ref.read(itemsRepositoryProvider).close(item.id, 'closed');
                  refresh();
                } else if (v == 'delete' && context.mounted && await confirmAction(context, l.delete, item.title, confirmLabel: l.delete, destructive: true)) {
                  await ref.read(itemsRepositoryProvider).remove(item.id);
                  if (context.mounted) context.go('/me/items');
                }
              }),
              itemBuilder: (_) => [
                if (active) PopupMenuItem(value: 'close', child: ListTile(leading: const Icon(Icons.archive_outlined), title: Text(l.closeListing))),
                PopupMenuItem(value: 'delete', child: ListTile(leading: Icon(Icons.delete_outline_rounded, color: Theme.of(context).colorScheme.error), title: Text(l.delete))),
              ],
            ),
          ],
        ),
      );
    }
    if (item.status != 'PUBLISHED') return const SizedBox.shrink();
    return GlassActionBar(
      child: FilledButton.icon(
        onPressed: () => requireAuth(context, ref, () async => context.push('/items/${item.id}/claim')),
        icon: Icon(item.isFound ? Icons.back_hand_outlined : Icons.lightbulb_outline_rounded),
        label: Text(item.isFound ? l.thisIsMine : l.maybeIFoundIt),
      ),
    );
  }
}

class _Gallery extends StatefulWidget {
  const _Gallery({required this.media});
  final List<MediaRef> media;
  @override
  State<_Gallery> createState() => _GalleryState();
}

class _GalleryState extends State<_Gallery> {
  int page = 0;
  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        PageView.builder(
          itemCount: widget.media.length,
          onPageChanged: (i) => setState(() => page = i),
          itemBuilder: (_, i) => NetImage(url: widget.media[i].publicUrl!, fit: BoxFit.cover),
        ),
        if (widget.media.length > 1)
          Positioned(
            bottom: 14,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                widget.media.length,
                (i) => AnimatedContainer(
                  duration: Motion.tap,
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: i == page ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: i == page ? 1 : 0.6), borderRadius: BorderRadius.circular(6)),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _IconHero extends StatelessWidget {
  const _IconHero({required this.item});
  final Item item;
  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    return Container(
      alignment: Alignment.bottomLeft,
      padding: const EdgeInsets.fromLTRB(Space.xl, 0, Space.xl, Space.m),
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(color: c.primaryContainer, borderRadius: BorderRadius.circular(18)),
        child: Icon(Labels.categoryIcon(item.category.icon), color: c.onPrimaryContainer, size: 28),
      ),
    );
  }
}
