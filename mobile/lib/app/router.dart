import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/session.dart';
import '../core/storage/prefs.dart';
import '../features/catalog/catalog_screen.dart';
import '../features/chat/chat_screen.dart';
import '../features/chat/chats_screen.dart';
import '../features/claims/claim_detail_screen.dart';
import '../features/claims/claim_form_screen.dart';
import '../features/claims/claims_list_screen.dart';
import '../features/community/community.dart';
import '../features/handoff/handoff_screen.dart';
import '../features/home/home_screen.dart';
import '../features/item/item_detail_screen.dart';
import '../features/item/matches_screen.dart';
import '../features/listing/found_flow_screen.dart';
import '../features/listing/lost_flow_screen.dart';
import '../features/listing/success_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/profile/help_screen.dart';
import '../features/profile/my_items_screen.dart';
import '../features/profile/notifications_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/profile/returns_screen.dart';
import '../features/profile/settings_screens.dart';
import '../shared/widgets.dart';
import 'shell.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final onboardingDone = ref.read(onboardingDoneProvider);
  GoRoute full(String path, Widget Function(GoRouterState s) builder) =>
      GoRoute(path: path, parentNavigatorKey: rootNavigatorKey, builder: (_, s) => builder(s));
  final router = GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: onboardingDone ? '/home' : '/onboarding',
    redirect: (context, state) {
      if (!ref.read(onboardingDoneProvider) && state.matchedLocation != '/onboarding') return '/onboarding';
      return null;
    },
    routes: [
      GoRoute(path: '/onboarding', builder: (_, _) => const OnboardingScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/home', builder: (_, _) => const HomeScreen())]),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/lost', builder: (_, s) => CatalogScreen(type: 'LOST', initialQuery: s.uri.queryParameters['q'], categoryId: s.uri.queryParameters['category'])),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/found', builder: (_, s) => CatalogScreen(type: 'FOUND', initialQuery: s.uri.queryParameters['q'], categoryId: s.uri.queryParameters['category'])),
            ],
          ),
          StatefulShellBranch(routes: [GoRoute(path: '/profile', builder: (_, _) => const ProfileScreen())]),
        ],
      ),
      // Full-screen flows live outside the shell so the camera never stacks under tabs (PRD §5.2).
      full('/new/found', (_) => const FoundFlowScreen()),
      full('/new/lost', (_) => const LostFlowScreen()),
      full(
        '/new/success',
        (s) => SuccessScreen(
          itemId: s.uri.queryParameters['item'] ?? '',
          type: s.uri.queryParameters['type'] ?? 'FOUND',
          status: s.uri.queryParameters['status'] ?? 'PUBLISHED',
          matches: int.tryParse(s.uri.queryParameters['matches'] ?? '0') ?? 0,
        ),
      ),
      full('/items/:id', (s) => ItemDetailScreen(itemId: s.pathParameters['id']!)),
      full('/items/:id/matches', (s) => MatchesScreen(itemId: s.pathParameters['id']!)),
      full('/items/:id/claim', (s) => ClaimFormScreen(itemId: s.pathParameters['id']!)),
      full('/items/:id/claims', (s) => ClaimsListScreen(itemId: s.pathParameters['id']!)),
      full('/claims', (s) => ClaimsListScreen(incoming: s.uri.queryParameters['incoming'] == '1')),
      full('/claims/:id', (s) => ClaimDetailScreen(claimId: s.pathParameters['id']!)),
      full('/claims/:id/handoff', (s) => HandoffScreen(claimId: s.pathParameters['id']!)),
      full('/conversations', (_) => const ChatsScreen()),
      full('/conversations/:id', (s) => ChatScreen(conversationId: s.pathParameters['id']!)),
      full('/notifications', (_) => const NotificationsScreen()),
      full('/me/items', (_) => const MyItemsScreen()),
      full('/me/returns', (_) => const ReturnsScreen()),
      full('/help', (_) => const HelpScreen()),
      full('/feedback', (_) => const FeedbackScreen()),
      full('/settings/language', (_) => const LanguageScreen()),
      full('/settings/appearance', (_) => const AppearanceScreen()),
      full('/settings/privacy', (_) => const PrivacyScreen()),
      full('/settings/security', (_) => const SecurityScreen()),
      full('/settings/notifications', (_) => const NotificationSettingsScreen()),
    ],
    errorBuilder: (context, state) => Scaffold(body: Center(child: Text(state.error?.toString() ?? 'Not found'))),
  );
  ref.listen(onboardingDoneProvider, (_, _) => router.refresh());
  ref.onDispose(router.dispose);
  return router;
});

/// Back that always leads somewhere: when the page was opened directly (a link,
/// a page refresh, or right after publishing) there is no history, so go home.
void goBack(BuildContext context) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go('/home');
  }
}

/// Opens a deep link produced by the server (tabyldy://items/{id}/matches, tabyldy://claims/{id}, ...).
void openDeepLink(BuildContext context, String? link) {
  if (link == null) return;
  final uri = Uri.tryParse(link);
  if (uri == null) return;
  final path = uri.scheme == 'tabyldy' ? '/${uri.host}${uri.path}' : uri.path;
  context.push(path);
}

/// Runs [action] that needs an account. Nobody is asked to register here: people who
/// have not signed in get a silent device guest account, so a find can be photographed
/// and posted right away. Signing in is offered only from the profile.
Future<void> requireAuth(BuildContext context, WidgetRef ref, Future<void> Function() action) async {
  try {
    await ref.read(sessionProvider.notifier).ensureAccount();
  } catch (e) {
    if (context.mounted) showSnack(context, errorText(context, e), error: true);
    return;
  }
  if (context.mounted) return action();
}
