import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';
import '../common.dart';

final matchesProvider = FutureProvider.autoDispose.family<List<MatchSuggestion>, String>(
  (ref, id) => ref.watch(itemsRepositoryProvider).matches(id),
);

/// Match suggestions (PRD §8.10): photo, category, location, date, safe reasons, "Check".
class MatchesScreen extends ConsumerWidget {
  const MatchesScreen({super.key, required this.itemId});
  final String itemId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final t = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.viewMatches)),
      body: AsyncBody(
        value: ref.watch(matchesProvider(itemId)),
        retry: () => ref.invalidate(matchesProvider(itemId)),
        builder: (items) => items.isEmpty
            ? StateView(icon: Icons.join_inner_rounded, title: l.matchesEmpty)
            : RefreshIndicator(
                onRefresh: () => ref.refresh(matchesProvider(itemId).future),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(Space.xl, Space.m, Space.xl, Space.xxxl),
                  children: [
                    Text(l.matchesTitle, style: t.textTheme.headlineSmall),
                    const SizedBox(height: Space.s),
                    InfoNote(text: l.matchDisclaimer, icon: Icons.info_outline_rounded),
                    const SizedBox(height: Space.l),
                    for (final m in items)
                      Padding(
                        padding: const EdgeInsets.only(bottom: Space.m),
                        child: Card(
                          clipBehavior: Clip.antiAlias,
                          child: Padding(
                            padding: const EdgeInsets.all(Space.m),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(18),
                                      child: SizedBox(
                                        width: 80,
                                        height: 80,
                                        child: m.thumbUrl != null
                                            ? NetImage(url: m.thumbUrl!, cacheWidth: 240)
                                            : ColoredBox(color: t.colorScheme.primaryContainer, child: Icon(Icons.inventory_2_outlined, color: t.colorScheme.onPrimaryContainer)),
                                      ),
                                    ),
                                    const SizedBox(width: Space.m),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          StatusChip(label: m.listingType == 'LOST' ? l.lostLabel : l.foundLabel, color: listingTypeColor(m.listingType)),
                                          const SizedBox(height: 6),
                                          Text(m.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: t.textTheme.titleMedium),
                                          const SizedBox(height: 4),
                                          Text(
                                            [
                                              if (m.locationName(context.localeCode) != null)
                                                m.locationName(context.localeCode)!,
                                              if (m.eventTimeStart != null) formatDate(context, m.eventTimeStart!),
                                            ].join(' · '),
                                            style: t.textTheme.bodySmall,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: Space.m),
                                Text(l.matchWhy, style: t.textTheme.labelSmall),
                                const SizedBox(height: 6),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  children: [for (final r in m.reasons) StatusChip(label: r, color: t.colorScheme.secondary, icon: Icons.check_rounded)],
                                ),
                                const SizedBox(height: Space.m),
                                Row(
                                  children: [
                                    TextButton.icon(
                                      onPressed: () => runAction(context, () async {
                                        await ref.read(itemsRepositoryProvider).dismissMatch(itemId, m.id);
                                        ref.invalidate(matchesProvider(itemId));
                                      }),
                                      icon: const Icon(Icons.visibility_off_outlined, size: 18),
                                      label: Text(l.dismiss),
                                    ),
                                    const Spacer(),
                                    FilledButton.icon(
                                      style: FilledButton.styleFrom(minimumSize: const Size(44, 42), padding: const EdgeInsets.symmetric(horizontal: 16)),
                                      onPressed: () => context.push('/items/${m.itemId}'),
                                      icon: const Icon(Icons.open_in_new_rounded, size: 18),
                                      label: Text(l.check),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
      ),
    );
  }
}
