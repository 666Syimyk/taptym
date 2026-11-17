import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';

/// Compact filter panel (PRD §8.6): category, city/district, colour, reward, sorting.
Future<ItemsQuery?> showFilterSheet(BuildContext context, WidgetRef ref, ItemsQuery current) {
  return showAppSheet<ItemsQuery>(context, builder: (_) => _FilterSheet(initial: current));
}

class _FilterSheet extends ConsumerStatefulWidget {
  const _FilterSheet({required this.initial});
  final ItemsQuery initial;
  @override
  ConsumerState<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends ConsumerState<_FilterSheet> {
  late ItemsQuery q = widget.initial;
  String? cityId;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final cats = ref.watch(categoriesProvider).value ?? const <Category>[];
    final locs = ref.watch(locationsProvider).value ?? const <Location>[];
    final cities = locs.where((x) => x.kind == 'city').toList();
    final selectedLoc = locs.where((x) => x.id == q.locationId).firstOrNull;
    cityId ??= selectedLoc == null ? null : (selectedLoc.kind == 'city' ? selectedLoc.id : selectedLoc.parentId);
    final districts = locs.where((x) => x.kind == 'district' && x.parentId == cityId).toList();

    Widget title(String s) => Padding(padding: const EdgeInsets.fromLTRB(0, Space.xl, 0, Space.s), child: Text(s, style: t.textTheme.titleMedium));

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      builder: (_, scroll) => Column(
        children: [
          Expanded(
            child: ListView(
              controller: scroll,
              padding: const EdgeInsets.fromLTRB(Space.xl, 0, Space.xl, Space.xl),
              children: [
                Row(
                  children: [
                    Expanded(child: Text(l.filters, style: t.textTheme.headlineSmall)),
                    TextButton(onPressed: () => setState(() => q = ItemsQuery(type: q.type, q: q.q)), child: Text(l.reset)),
                  ],
                ),
                title(l.sortLabel),
                SegmentedButton<String>(
                  segments: [ButtonSegment(value: 'newest', label: Text(l.sortNewest)), ButtonSegment(value: 'relevance', label: Text(l.sortRelevance))],
                  selected: {q.sort ?? 'newest'},
                  onSelectionChanged: (s) => setState(() => q = q.copyWith(sort: s.first)),
                ),
                title(l.category),
                Wrap(
                  spacing: Space.s,
                  runSpacing: Space.s,
                  children: [
                    ChoiceChip(label: Text(l.anyOption), selected: q.categoryId == null, onSelected: (_) => setState(() => q = q.copyWith(clearCategory: true))),
                    for (final c in cats)
                      ChoiceChip(
                        avatar: Icon(Labels.categoryIcon(c.icon), size: 16),
                        label: Text(c.name(context.localeCode)),
                        selected: q.categoryId == c.id,
                        onSelected: (v) => setState(() => q = q.copyWith(categoryId: c.id, clearCategory: !v)),
                      ),
                  ],
                ),
                title(l.city),
                Wrap(
                  spacing: Space.s,
                  runSpacing: Space.s,
                  children: [
                    ChoiceChip(
                      label: Text(l.anyOption),
                      selected: cityId == null,
                      onSelected: (_) => setState(() {
                        cityId = null;
                        q = q.copyWith(clearLocation: true);
                      }),
                    ),
                    for (final c in cities)
                      ChoiceChip(
                        label: Text(c.name(context.localeCode)),
                        selected: cityId == c.id,
                        onSelected: (_) => setState(() {
                          cityId = c.id;
                          q = q.copyWith(locationId: c.id);
                        }),
                      ),
                  ],
                ),
                if (districts.isNotEmpty) ...[
                  title(l.district),
                  Wrap(
                    spacing: Space.s,
                    runSpacing: Space.s,
                    children: [
                      ChoiceChip(label: Text(l.anyOption), selected: q.locationId == cityId, onSelected: (_) => setState(() => q = q.copyWith(locationId: cityId))),
                      for (final d in districts)
                        ChoiceChip(
                          label: Text(d.name(context.localeCode)),
                          selected: q.locationId == d.id,
                          onSelected: (_) => setState(() => q = q.copyWith(locationId: d.id)),
                        ),
                    ],
                  ),
                ],
                title(l.color),
                Wrap(
                  spacing: Space.s,
                  runSpacing: Space.s,
                  children: [
                    ChoiceChip(label: Text(l.anyOption), selected: q.color == null, onSelected: (_) => setState(() => q = q.copyWith(clearColor: true))),
                    for (final c in Labels.colorKeys)
                      ChoiceChip(
                        avatar: ColorDot(colorKey: c),
                        label: Text(Labels.color(l, c)),
                        selected: q.color == c,
                        onSelected: (v) => setState(() => q = q.copyWith(color: c, clearColor: !v)),
                      ),
                  ],
                ),
                if (q.type == 'LOST') ...[
                  const SizedBox(height: Space.l),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(l.withReward),
                    value: q.withReward,
                    onChanged: (v) => setState(() => q = q.copyWith(withReward: v)),
                  ),
                ],
              ],
            ),
          ),
          GlassActionBar(child: FilledButton(onPressed: () => Navigator.pop(context, q), child: Text(l.apply))),
        ],
      ),
    );
  }
}
