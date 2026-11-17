import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'models.dart';
import 'network/api_client.dart';
import 'network/api_error.dart';
import 'repositories.dart';

/// Session state: guest (null) or signed-in profile. Loaded once at startup from the
/// secure token store; the splash waits on this (PRD §8.1).
class SessionController extends AsyncNotifier<Me?> {
  @override
  Future<Me?> build() async {
    final token = await ref.read(tokenStoreProvider).accessToken();
    if (token == null) return null;
    try {
      return await ref.read(accountRepositoryProvider).me();
    } on ApiError catch (e) {
      if (e.isUnauthorized) {
        await ref.read(tokenStoreProvider).clear();
        return null;
      }
      // Offline: stay "signed in" with a minimal profile so the UI keeps working.
      final userId = await ref.read(tokenStoreProvider).userId();
      return userId == null
          ? null
          : Me(
              id: userId,
              publicName: '',
              locale: 'ru',
              accountStatus: 'ACTIVE',
              trustLevel: 'ContactVerified',
              notificationPrefs: const {},
              contacts: const [],
              activeItems: 0,
            );
    }
  }

  bool get isSignedIn => state.value != null;

  Future<void>? _creatingGuest;

  /// Makes sure there is an account to act with. People who never signed in get a
  /// silent, device-bound guest account — no phone, no code, no forms. Signing in
  /// later from the profile keeps everything they posted.
  Future<void> ensureAccount() async {
    if (isSignedIn) return;
    await (_creatingGuest ??= _createGuest().whenComplete(
      () => _creatingGuest = null,
    ));
  }

  Future<void> _createGuest() async {
    final r = await ref.read(authFlowProvider).guest(
      locale: ref.read(acceptLanguageProvider),
      platform: kIsWeb ? 'web' : defaultTargetPlatform.name,
    );
    await signedIn(r.access, r.refresh, r.userId);
  }

  Future<void> signedIn(String access, String refresh, String userId) async {
    await ref.read(tokenStoreProvider).save(access, refresh, userId);
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(accountRepositoryProvider).me(),
    );
  }

  Future<void> refreshProfile() async {
    if (!isSignedIn) return;
    state = await AsyncValue.guard(
      () => ref.read(accountRepositoryProvider).me(),
    );
  }

  Future<void> signOut({bool remote = true}) async {
    if (remote) {
      try {
        await ref.read(accountRepositoryProvider).logout();
      } catch (_) {}
    }
    await ref.read(tokenStoreProvider).clear();
    state = const AsyncData(null);
  }
}

final sessionProvider = AsyncNotifierProvider<SessionController, Me?>(
  SessionController.new,
);

/// Convenience: current user id or null.
final currentUserIdProvider = Provider<String?>(
  (ref) => ref.watch(sessionProvider).value?.id,
);
final isSignedInProvider = Provider<bool>(
  (ref) => ref.watch(sessionProvider).value != null,
);

/// Signed in only through a silent device account (no verified contact yet).
final isGuestProvider = Provider<bool>(
  (ref) => ref.watch(sessionProvider).value?.isGuest ?? false,
);

/// Auth flow (PRD §9): start → verify. Tokens are stored by SessionController.
class AuthFlow {
  AuthFlow(this._api);
  final ApiClient _api;

  Future<({String challengeId, int expiresIn, String? devCode})> start(
    String channel,
    String destination,
  ) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/v1/auth/start',
      data: {'channel': channel, 'destination': destination},
    );
    return (
      challengeId: data['challengeId'] as String,
      expiresIn: (data['expiresInSeconds'] as num).toInt(),
      devCode: data['devCode'] as String?,
    );
  }

  Future<({String access, String refresh, String userId, bool isNew})> guest({
    required String locale,
    required String platform,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/v1/auth/guest',
      data: {'locale': locale, 'platform': platform},
    );
    return (
      access: data['accessToken'] as String,
      refresh: data['refreshToken'] as String,
      userId: data['userId'] as String,
      isNew: true,
    );
  }

  /// [guestRefreshToken] lets the server keep (or merge) what this device's guest posted.
  Future<({String access, String refresh, String userId, bool isNew})> verify(
    String challengeId,
    String code, {
    required String locale,
    required String platform,
    String? guestRefreshToken,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/v1/auth/verify',
      data: {
        'challengeId': challengeId,
        'code': code,
        'locale': locale,
        'platform': platform,
        'guestRefreshToken': ?guestRefreshToken,
      },
    );
    return (
      access: data['accessToken'] as String,
      refresh: data['refreshToken'] as String,
      userId: data['userId'] as String,
      isNew: data['isNewAccount'] == true,
    );
  }
}

final authFlowProvider = Provider(
  (ref) => AuthFlow(ref.watch(apiClientProvider)),
);
