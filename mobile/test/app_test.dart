import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tabyldy/app/app.dart';
import 'package:tabyldy/app/router.dart';
import 'package:tabyldy/core/network/api_client.dart';
import 'package:tabyldy/core/storage/prefs.dart';
import 'package:tabyldy/core/storage/token_store.dart';

class MemoryTokens extends TokenStore {
  String? access, refresh, user;
  @override
  Future<String?> accessToken() async => access;
  @override
  Future<String?> refreshToken() async => refresh;
  @override
  Future<String?> userId() async => user;
  @override
  Future<void> save(String a, String r, String u) async {
    access = a;
    refresh = r;
    user = u;
  }

  @override
  Future<void> clear() async {
    access = null;
    refresh = null;
    user = null;
  }
}

class FakeServer implements HttpClientAdapter {
  bool failFeed = false;
  int feedCalls = 0, publications = 0;
  bool handoffCreated = false;
  int guestAccounts = 0;
  Map<String, Object> handoff() => {
    'id': 'handoff-1',
    'claimId': 'claim-1',
    'itemId': 'item-1',
    'itemTitle': 'Кошелёк',
    'state': 'PENDING',
    'method': 'meeting',
    'myRole': 'holder',
    'iConfirmed': false,
    'otherConfirmed': false,
    'disclaimer': '',
  };
  @override
  void close({bool force = false}) {}
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? stream,
    Future<void>? cancel,
  ) async {
    Object? body;
    switch (options.path) {
      case '/v1/items':
        if (options.method == 'POST') {
          publications++;
          body = {};
          break;
        }
        feedCalls++;
        if (failFeed) {
          return ResponseBody.fromString(
            '{"code":"error.internal","message":"Сервис временно недоступен"}',
            503,
            headers: {
              'content-type': ['application/json'],
            },
          );
        }
        body = {'items': [], 'nextCursor': null};
      case '/v1/categories':
        body = [
          {
            'id': 'cat-1',
            'slug': 'documents',
            'nameRu': 'Документы',
            'nameKy': 'Документтер',
            'icon': 'id-card',
            'sensitive': true,
            'publicationPolicy': 'restricted_photo',
          },
        ];
      case '/v1/locations':
        body = [];
      case '/v1/claims/claim-1/handoff':
        body = handoffCreated ? handoff() : null;
      case '/v1/handoffs':
        handoffCreated = true;
        body = {...handoff(), 'confirmationCode': '123456'};
      case '/v1/conversations/unread-count':
        body = {'count': 0};
      case '/v1/auth/guest':
        guestAccounts++;
        body = {
          'accessToken': 'guest-access',
          'refreshToken': 'guest-refresh-token-0123456789',
          'expiresInSeconds': 900,
          'userId': 'guest-1',
          'isNewAccount': true,
        };
      case '/v1/me':
        body = {'id': 'guest-1', 'publicName': 'Пользователь', 'trustLevel': 'Guest'};
      default:
        body = {};
    }
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
      headers: {
        'content-type': ['application/json'],
      },
    );
  }
}

Future<void> mount(
  WidgetTester tester,
  FakeServer server, {
  Map<String, Object> preferences = const {},
  Locale device = const Locale('ru'),
}) async {
  // The test device speaks English by default; most scenarios run in Russian.
  tester.platformDispatcher.localesTestValue = [device];
  addTearDown(tester.platformDispatcher.clearLocalesTestValue);
  // Ambient effects (drifting background, pulsing camera button) loop forever and
  // would keep pumpAndSettle waiting; they stop under the reduced-motion setting.
  tester.platformDispatcher.accessibilityFeaturesTestValue =
      const FakeAccessibilityFeatures(disableAnimations: true);
  addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
  SharedPreferences.setMockInitialValues(preferences);
  final prefs = await SharedPreferences.getInstance();
  final dio = Dio(BaseOptions(baseUrl: 'http://test.local'))
    ..httpClientAdapter = server;
  await tester.pumpWidget(
    ProviderScope(
      // Fail fast in tests: no automatic provider retries hiding error states.
      retry: (_, _) => null,
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        tokenStoreProvider.overrideWithValue(MemoryTokens()),
        dioProvider.overrideWithValue(dio),
      ],
      child: const TabyldyApp(),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'holder sees the one-time handoff code after the server refresh',
    (tester) async {
      await mount(
        tester,
        FakeServer(),
        preferences: {PrefKeys.onboardingDone: true},
      );
      final container = ProviderScope.containerOf(
        tester.element(find.byType(TabyldyApp)),
      );
      container.read(routerProvider).push('/claims/claim-1/handoff');
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Предложить'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Предложить'));
      await tester.pumpAndSettle();
      // The code is drawn digit by digit and read out as one label.
      expect(find.byWidgetPredicate((w) => w is Semantics && w.properties.label == '1 2 3 4 5 6'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'guest completes onboarding without an account; choice persists',
    (tester) async {
      await mount(tester, FakeServer());
      expect(find.text('Потерянное может найтись'), findsOneWidget);
      await tester.tap(find.text('Пропустить'));
      await tester.pumpAndSettle();
      expect(find.text('Поможем вернуть потерянное'), findsOneWidget);
      expect(
        (await SharedPreferences.getInstance()).getBool(
          PrefKeys.onboardingDone,
        ),
        true,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets('English device opens the app in English', (tester) async {
    await mount(tester, FakeServer(), device: const Locale('en', 'US'));
    expect(find.text("What's lost can be found"), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  testWidgets('Kyrgyz onboarding supports narrow screens and large text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 740);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 1.4;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await mount(
      tester,
      FakeServer(),
      preferences: {PrefKeys.locale: 'ky', PrefKeys.themeMode: 'dark'},
    );
    expect(find.text('Пропустить'), findsNothing);
    expect(find.byType(FilledButton), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  testWidgets(
    'failed feed offers retry and recovers without losing navigation',
    (tester) async {
      final server = FakeServer()..failFeed = true;
      await mount(tester, server, preferences: {PrefKeys.onboardingDone: true});
      expect(find.text('Сервис временно недоступен'), findsOneWidget);
      server.failFeed = false;
      await tester.drag(find.byType(ListView).first, const Offset(0, -450));
      await tester.pumpAndSettle();
      // Both home feeds (recent and nearby) failed — retry each of them.
      for (var i = 0; i < 3 && find.text('Повторить').evaluate().isNotEmpty; i++) {
        await tester.ensureVisible(find.text('Повторить').first);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Повторить').first);
        await tester.pumpAndSettle();
      }
      expect(server.feedCalls, greaterThan(1));
      expect(find.text('Сервис временно недоступен'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'posting needs no sign-up: a silent guest account opens the wizard directly',
    (tester) async {
      final server = FakeServer();
      await mount(tester, server, preferences: {PrefKeys.onboardingDone: true});
      await tester.tap(find.text('Я потерял'));
      await tester.pumpAndSettle();
      expect(server.guestAccounts, 1);
      expect(find.text('Войти или создать аккаунт'), findsNothing);
      expect(find.text('Что вы потеряли?'), findsWidgets);
      expect(server.publications, 0);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      // Signed in now, so unread-count polling started; let its pending delay elapse.
      await tester.pump(const Duration(minutes: 1));
    },
  );
}
