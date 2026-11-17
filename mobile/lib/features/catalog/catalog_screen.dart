import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/l10n_ext.dart';
import '../../core/models.dart' as model;
import '../../core/repositories.dart';
import '../../core/storage/prefs.dart';
import '../../core/theme/tokens.dart';
import '../../shared/motion.dart';
import '../../shared/widgets.dart';
import 'filter_sheet.dart';

/// Catalog of lost or found items (PRD §8.4/§8.5/§8.6): search with suggestions and
/// recent queries, category chips, filter sheet, sorting, infinite scroll, offline cache.
class CatalogScreen extends ConsumerStatefulWidget {
  const CatalogScreen({super.key, required this.type, this.initialQuery, this.categoryId});
  final String type;
  final String? initialQuery, categoryId;
  @override
  ConsumerState<CatalogScreen> createState() => _CatalogState();
}

class _CatalogState extends ConsumerState<CatalogScreen> {
  late final TextEditingController search;
  final focus = FocusNode();
  final scroll = ScrollController();
  late ItemsQuery query;
  List<model.Item> items = [];
  String? cursor;
  Object? error;
  bool loading = true, more = false, fromCache = false, showSuggest = false;
  List<String> suggestions = const [];
  Timer? debounce;
  int generation = 0;

  @override
  void initState() {
    super.initState();
    search = TextEditingController(text: widget.initialQuery);
    query = ItemsQuery(type: widget.type, q: widget.initialQuery, categoryId: widget.categoryId);
    focus.addListener(() => setState(() => showSuggest = focus.hasFocus));
    scroll.addListener(() {
      if (scroll.position.pixels > scroll.position.maxScrollExtent - 400 && cursor != null && !more && !loading) {
        load(append: true);
      }
    });
    load();
  }

  @override
  void didUpdateWidget(CatalogScreen old) {
    super.didUpdateWidget(old);
    if (old.initialQuery != widget.initialQuery || old.categoryId != widget.categoryId) {
      search.text = widget.initialQuery ?? '';
      query = ItemsQuery(type: widget.type, q: widget.initialQuery, categoryId: widget.categoryId);
      load();
    }
  }

  @override
  void dispose() {
    debounce?.cancel();
    search.dispose();
    focus.dispose();
    scroll.dispose();
    super.dispose();
  }

  Future<void> load({bool append = false}) async {
    final current = ++generation;
    setState(() {
      if (append) {
        more = true;
      } else {
        loading = true;
      }
      error = null;
    });
    try {
      final page = await ref.read(itemsRepositoryProvider).list(query, cursor: append ? cursor : null);
      if (mounted && current == generation) {
        setState(() {
          items = append ? [...items, ...page.items] : page.items;
          cursor = page.nextCursor;
          fromCache = page.fromCache;
        });
      }
    } catch (e) {
      if (mounted && current == generation) setState(() => error = e);
    } finally {
      if (mounted && current == generation) {
        setState(() {
          loading = false;
          more = false;
        });
      }
    }
  }

  void apply(ItemsQuery next) {
    query = next;
    if (scroll.hasClients) scroll.jumpTo(0);
    load();
  }

  void submitSearch(String value) {
    focus.unfocus();
    final q = value.trim();
    if (q.isNotEmpty) ref.read(recentSearchesProvider.notifier).add(q);
    apply(query.copyWith(q: q, sort: q.isEmpty ? 'newest' : query.sort));
  }

  void onSearchChanged(String value) {
    debounce?.cancel();
    debounce = Timer(const Duration(milliseconds: 300), () async {
      if (value.trim().length < 2) {
        if (mounted) setState(() => suggestions = const []);
        return;
      }
      try {
        final list = await ref.read(itemsRepositoryProvider).suggest(value.trim());
        if (mounted && search.text == value) setState(() => suggestions = list);
      } catch (_) {}
    });
  }

  Future<void> openFilters() async {
    final next = await showFilterSheet(context, ref, query);
    if (next != null) apply(next);
  }

  int get activeFilters => [query.categoryId, query.locationId, query.color].whereType<String>().length + (query.withReward ? 1 : 0);

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final cats = ref.watch(categoriesProvider).value ?? const <model.Category>[];
    final recent = ref.watch(recentSearchesProvider);
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(Space.xl, Space.m, Space.xl, 0),
              child: Row(
                children: [
                  Expanded(child: Text(widget.type == 'LOST' ? l.lostCatalogTitle : l.foundCatalogTitle, style: t.textTheme.headlineMedium)),
                  if (query.hasFilters || (query.q ?? '').isNotEmpty)
                    TextButton.icon(
                      onPressed: () {
                        search.clear();
                        apply(ItemsQuery(type: widget.type));
                      },
                      icon: const Icon(Icons.filter_alt_off_outlined, size: 18),
                      label: Text(l.reset),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Space.xl, Space.m, Space.xl, 0),
              child: TextField(
                controller: search,
                focusNode: focus,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: l.searchHint,
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: search.text.isEmpty
                      ? null
                      : IconButton(
                          tooltip: l.reset,
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () {
                            search.clear();
                            submitSearch('');
                          },
                        ),
                ),
                onChanged: onSearchChanged,
                onSubmitted: submitSearch,
              ),
            ),
            if (showSuggest && (suggestions.isNotEmpty || recent.isNotEmpty))
              Padding(
                padding: const EdgeInsets.fromLTRB(Space.xl, Space.s, Space.xl, 0),
                child: Card(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (suggestions.isNotEmpty) ...[
                        Padding(padding: const EdgeInsets.fromLTRB(16, 12, 16, 4), child: Text(l.suggestions, style: t.textTheme.labelSmall)),
                        for (final s in suggestions.take(6))
                          ListTile(
                            dense: true,
                            leading: const Icon(Icons.search_rounded, size: 18),
                            title: Text(s),
                            onTap: () {
                              search.text = s;
                              submitSearch(s);
                            },
                          ),
                      ],
                      if (recent.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 4, 0),
                          child: Row(
                            children: [
                              Expanded(child: Text(l.recentSearches, style: t.textTheme.labelSmall)),
                              TextButton(onPressed: () => ref.read(recentSearchesProvider.notifier).clear(), child: Text(l.clearRecent)),
                            ],
                          ),
                        ),
                        for (final s in recent.take(5))
                          ListTile(
                            dense: true,
                            leading: const Icon(Icons.history_rounded, size: 18),
                            title: Text(s),
                            onTap: () {
                              search.text = s;
                              submitSearch(s);
                            },
                          ),
                      ],
                      const SizedBox(height: 6),
                    ],
                  ),
                ),
              ),
            SizedBox(
              height: 44,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(Space.xl, Space.m, Space.xl, 0),
                children: [
                  ChoiceChip(
                    label: Text(l.allCategories),
                    selected: query.categoryId == null,
                    onSelected: (_) => apply(query.copyWith(clearCategory: true)),
                  ),
                  for (final c in cats) ...[
                    const SizedBox(width: Space.s),
                    ChoiceChip(
                      avatar: Icon(Labels.categoryIcon(c.icon), size: 16),
                      label: Text(c.name(context.localeCode)),
                      selected: query.categoryId == c.id,
                      onSelected: (v) => apply(query.copyWith(categoryId: c.id, clearCategory: !v)),
                    ),
                  ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Space.xl, Space.s, Space.xl, 0),
              child: Row(
                children: [
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(minimumSize: const Size(44, 40), padding: const EdgeInsets.symmetric(horizontal: 14)),
                    onPressed: openFilters,
                    icon: Badge(isLabelVisible: activeFilters > 0, label: Text('$activeFilters'), child: const Icon(Icons.tune_rounded, size: 18)),
                    label: Text(l.filters),
                  ),
                  const SizedBox(width: Space.s),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(minimumSize: const Size(44, 40), padding: const EdgeInsets.symmetric(horizontal: 14)),
                    onPressed: () => apply(query.copyWith(sort: query.sort == 'relevance' ? 'newest' : 'relevance')),
                    icon: const Icon(Icons.swap_vert_rounded, size: 18),
                    label: Text(query.sort == 'relevance' ? l.sortRelevance : l.sortNewest),
                  ),
                  const Spacer(),
                  if (!loading && items.isNotEmpty) Text(l.resultsCount(items.length), style: t.textTheme.labelSmall),
                ],
              ),
            ),
            if (fromCache) const OfflineBanner(),
            Expanded(
              child: loading
                  ? const SkeletonList()
                  : error != null && items.isEmpty
                  ? ErrorView(error: error!, onRetry: load)
                  : items.isEmpty
                  ? StateView(
                      icon: Icons.search_off_rounded,
                      title: l.emptySearch,
                      actionLabel: l.changeFilters,
                      onAction: openFilters,
                      secondaryLabel: l.createListing,
                      onSecondary: () => requireAuth(context, ref, () async => context.push('/new/${widget.type == 'LOST' ? 'lost' : 'found'}')),
                    )
                  : RefreshIndicator(
                      onRefresh: load,
                      child: ListView.builder(
                        controller: scroll,
                        padding: const EdgeInsets.fromLTRB(Space.xl, Space.m, Space.xl, 120),
                        itemCount: items.length + 1,
                        itemBuilder: (_, i) {
                          if (i == items.length) {
                            if (error != null) return ErrorView(error: error!, onRetry: () => load(append: true));
                            if (more) return const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator.adaptive()));
                            if (cursor == null && items.length > 5) {
                              return Padding(padding: const EdgeInsets.all(16), child: Center(child: Text(l.endOfList, style: t.textTheme.labelSmall)));
                            }
                            return const SizedBox(height: 16);
                          }
                          final item = items[i];
                          return FadeSlideIn.stagger(
                            key: ValueKey(item.id),
                            index: i < 10 ? i : 0,
                            child: Padding(
                            padding: const EdgeInsets.only(bottom: Space.m),
                            child: ItemCard(
                              item: item,
                              onTap: () => context.push('/items/${item.id}'),
                              onSecondary: () => requireAuth(context, ref, () async => context.push('/items/${item.id}/claim')),
                            ),
                          ),
                          );
                        },
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
