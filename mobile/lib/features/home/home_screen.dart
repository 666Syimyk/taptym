import 'package:flutter/material.dart' hide Page;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../core/session.dart';
import '../../core/storage/prefs.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../shared/motion.dart';
import '../../shared/widgets.dart';
import '../chat/chat_providers.dart';
import '../common.dart';
import '../onboarding/onboarding_screen.dart';

final recentItemsProvider = FutureProvider<Page<Item>>(
  (ref) => ref.watch(itemsRepositoryProvider).list(const ItemsQuery()),
);

/// Found items in the preferred city (district-level approximation, PRD §8.3 item 8).
final nearbyItemsProvider = FutureProvider<Page<Item>>((ref) {
  final city = ref.watch(preferredCityProvider);
  return ref.watch(itemsRepositoryProvider).list(ItemsQuery(type: 'FOUND', locationId: city));
});

/// Home (PRD §8.3): logo, notification/message icons, greeting, search, two main
/// actions, recent items, categories, nearby finds, safety tips. Not an endless feed.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final t = Theme.of(context);
    final me = ref.watch(sessionProvider).value;
    final unreadNotifs = ref.watch(unreadNotificationsProvider).value ?? 0;
    final unreadMsgs = ref.watch(unreadMessagesProvider).value ?? 0;
    final cityId = ref.watch(preferredCityProvider);
    final cityName = ref.watch(locationsProvider).value?.where((c) => c.id == cityId).firstOrNull?.name(context.localeCode);

    Future<void> refresh() async {
      ref.invalidate(recentItemsProvider);
      ref.invalidate(nearbyItemsProvider);
      ref.invalidate(categoriesProvider);
      await ref.read(recentItemsProvider.future);
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(0, 0, 0, 120),
          children: staggered([
            SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(Space.xl, Space.m, Space.l, 0),
                child: Row(
                  children: [
                    const AppLogoMark(size: 36),
                    const SizedBox(width: 10),
                    Text(l.appName, style: t.textTheme.titleLarge),
                    const Spacer(),
                    BadgeIconButton(
                      icon: Icons.notifications_outlined,
                      tooltip: l.notifications,
                      count: unreadNotifs,
                      onPressed: () => requireAuth(context, ref, () async => context.push('/notifications')),
                    ),
                    const SizedBox(width: 8),
                    BadgeIconButton(
                      icon: Icons.chat_bubble_outline_rounded,
                      tooltip: l.messages,
                      count: unreadMsgs,
                      onPressed: () => requireAuth(context, ref, () async => context.push('/conversations')),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Space.xl, Space.xxl, Space.xl, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    me == null || me.isGuest
                        ? l.homeGreetingGuest
                        : me.publicName.trim().isEmpty
                        ? l.homeGreeting
                        : l.homeGreetingName(me.publicName),
                    style: t.textTheme.displaySmall,
                  ),
                  const SizedBox(height: 6),
                  Text(l.homeSubtitle, style: t.textTheme.bodyLarge?.copyWith(color: t.colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Space.xl, Space.xl, Space.xl, 0),
              child: _SearchBar(onSubmit: (q) => context.go('/found?q=${Uri.encodeComponent(q)}')),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Space.xl, Space.l, Space.xl, 0),
              child: Row(
                children: [
                  Expanded(
                    child: _HeroAction(
                      title: l.iLost,
                      body: l.homeHeroLostBody,
                      icon: Icons.manage_search_rounded,
                      accent: const Color(0xFFE2762A),
                      onTap: () => requireAuth(context, ref, () async => context.push('/new/lost')),
                    ),
                  ),
                  const SizedBox(width: Space.m),
                  Expanded(
                    child: _HeroAction(
                      title: l.iFound,
                      body: l.homeHeroFoundBody,
                      icon: Icons.photo_camera_rounded,
                      accent: TabyldyColors.primary,
                      filled: true,
                      onTap: () => requireAuth(context, ref, () async => context.push('/new/found')),
                    ),
                  ),
                ],
              ),
            ),
            SectionHeader(title: l.recentItems, actionLabel: l.seeAll, onAction: () => context.go('/found'), padding: const EdgeInsets.fromLTRB(Space.xl, Space.xxl, Space.m, Space.s)),
            AsyncBody(
                value: ref.watch(recentItemsProvider),
                retry: () => ref.invalidate(recentItemsProvider),
                loading: const SizedBox(height: 232, child: _CarouselSkeleton()),
                builder: (page) => page.items.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.symmetric(horizontal: Space.xl),
                        child: _EmptyCard(text: l.homeEmptyRecent, actionLabel: l.createListing, onAction: () => requireAuth(context, ref, () async => context.push('/new/found'))),
                      )
                    : SizedBox(height: 232, child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: Space.xl),
                        itemCount: page.items.length.clamp(0, 10),
                        separatorBuilder: (_, _) => const SizedBox(width: Space.m),
                        itemBuilder: (_, i) => FadeSlideIn.stagger(
                          index: i,
                          offset: const Offset(32, 0),
                          child: ItemTile(item: page.items[i], onTap: () => context.push('/items/${page.items[i].id}')),
                        ),
                      )),
            ),
            SectionHeader(title: l.categories, padding: const EdgeInsets.fromLTRB(Space.xl, Space.xl, Space.xl, Space.s)),
            SizedBox(
              height: 44,
              child: AsyncBody(
                value: ref.watch(categoriesProvider),
                retry: () => ref.invalidate(categoriesProvider),
                loading: const SizedBox.shrink(),
                builder: (cats) => ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: Space.xl),
                  itemCount: cats.length,
                  separatorBuilder: (_, _) => const SizedBox(width: Space.s),
                  itemBuilder: (_, i) => ActionChip(
                    avatar: Icon(Labels.categoryIcon(cats[i].icon), size: 18),
                    label: Text(cats[i].name(context.localeCode)),
                    onPressed: () => context.go('/found?category=${cats[i].id}'),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Space.xl, Space.xxl, Space.m, Space.s),
              child: Row(
                children: [
                  Expanded(child: Text(l.nearby, style: t.textTheme.headlineSmall)),
                  ActionChip(
                    avatar: const Icon(Icons.location_city_rounded, size: 18),
                    label: Text(cityName ?? l.allCities),
                    onPressed: () => pickCity(context, ref),
                  ),
                ],
              ),
            ),
            AsyncBody(
              value: ref.watch(nearbyItemsProvider),
              retry: () => ref.invalidate(nearbyItemsProvider),
              loading: const Padding(padding: EdgeInsets.symmetric(horizontal: Space.xl), child: LinearProgressIndicator()),
              builder: (page) => page.items.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(horizontal: Space.xl),
                      child: _EmptyCard(text: l.nothingNearby, actionLabel: l.chooseCity, onAction: () => pickCity(context, ref)),
                    )
                  : Column(
                      children: [
                        for (final (i, item) in page.items.take(5).indexed)
                          FadeSlideIn.stagger(
                            index: i,
                            child: Padding(
                              padding: const EdgeInsets.fromLTRB(Space.xl, 0, Space.xl, Space.m),
                              child: ItemCard(item: item, onTap: () => context.push('/items/${item.id}')),
                            ),
                          ),
                      ],
                    ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Space.xl, Space.l, Space.xl, 0),
              child: GlassPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.shield_rounded, color: t.colorScheme.secondary),
                        const SizedBox(width: 8),
                        Text(l.safetyTipsTitle, style: t.textTheme.titleMedium),
                      ],
                    ),
                    const SizedBox(height: Space.m),
                    for (final tip in [l.safetyTip1, l.safetyTip2, l.safetyTip3])
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.check_circle_rounded, size: 18, color: t.colorScheme.secondary),
                            const SizedBox(width: 8),
                            Expanded(child: Text(tip, style: t.textTheme.bodyMedium)),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar({required this.onSubmit});
  final ValueChanged<String> onSubmit;
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return TextField(
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(hintText: l.searchHint, prefixIcon: const Icon(Icons.search_rounded)),
      onSubmitted: (q) {
        if (q.trim().isNotEmpty) onSubmit(q.trim());
      },
    );
  }
}

/// Main action card. Flat and calm: the found flow is the solid primary action,
/// the lost flow a quiet surface with a warm accent icon.
class _HeroAction extends StatelessWidget {
  const _HeroAction({required this.title, required this.body, required this.icon, required this.accent, required this.onTap, this.filled = false});
  final String title, body;
  final IconData icon;
  final Color accent;
  final bool filled;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final dark = t.brightness == Brightness.dark;
    final fg = filled ? Colors.white : t.colorScheme.onSurface;
    return Semantics(
      button: true,
      label: title,
      child: PressScale(
        child: Material(
          color: filled ? accent : (dark ? Glass.darkFill : Glass.lightFill).withValues(alpha: dark ? 0.96 : 0.98),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Radii.card),
            side: BorderSide(color: filled ? accent : (dark ? Glass.darkBorder : TabyldyColors.mainText.withValues(alpha: 0.1))),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            child: Container(
              height: 150,
              padding: const EdgeInsets.all(Space.l),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: filled ? Colors.white.withValues(alpha: 0.18) : accent.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(Radii.chip),
                    ),
                    child: Icon(icon, color: filled ? Colors.white : accent, size: 22),
                  ),
                  const Spacer(),
                  Text(title, style: t.textTheme.titleLarge?.copyWith(color: fg)),
                  const SizedBox(height: 2),
                  Text(body, maxLines: 2, overflow: TextOverflow.ellipsis, style: t.textTheme.bodySmall?.copyWith(color: fg.withValues(alpha: 0.78))),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.text, required this.actionLabel, required this.onAction});
  final String text, actionLabel;
  final VoidCallback onAction;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(Space.l),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.inventory_2_outlined, color: Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(width: Space.m),
              Expanded(child: Text(text, style: Theme.of(context).textTheme.bodyMedium)),
            ],
          ),
          Align(alignment: Alignment.centerRight, child: TextButton(onPressed: onAction, child: Text(actionLabel))),
        ],
      ),
    ),
  );
}

class _CarouselSkeleton extends StatelessWidget {
  const _CarouselSkeleton();
  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme.surfaceContainerHighest;
    return ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: Space.xl),
      itemCount: 3,
      separatorBuilder: (_, _) => const SizedBox(width: Space.m),
      itemBuilder: (_, _) => Container(width: 150, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(Radii.card))),
    );
  }
}
