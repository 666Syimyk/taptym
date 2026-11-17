import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Overridden in main() with the real instance.
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences must be overridden');
});

class PrefKeys {
  static const locale = 'locale';
  static const themeMode = 'theme_mode';
  static const onboardingDone = 'onboarding_done';
  static const recentSearches = 'recent_searches';
  static const foundDraft = 'draft_found';
  static const lostDraft = 'draft_lost';
  static const feedCache = 'feed_cache_';
  static const anonymousId = 'anonymous_id';
  static const preferredCity = 'preferred_city';
}

/// Locale chosen by the user; null = follow system (ru/ky supported, ru fallback).
class LocaleController extends Notifier<Locale?> {
  @override
  Locale? build() {
    final code = ref.watch(sharedPreferencesProvider).getString(PrefKeys.locale);
    return code == null ? null : Locale(code);
  }

  Future<void> set(Locale? locale) async {
    final prefs = ref.read(sharedPreferencesProvider);
    if (locale == null) {
      await prefs.remove(PrefKeys.locale);
    } else {
      await prefs.setString(PrefKeys.locale, locale.languageCode);
    }
    state = locale;
  }
}

final localeProvider = NotifierProvider<LocaleController, Locale?>(
  LocaleController.new,
);

class ThemeModeController extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    final v = ref.watch(sharedPreferencesProvider).getString(PrefKeys.themeMode);
    return switch (v) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
  }

  Future<void> set(ThemeMode mode) async {
    await ref
        .read(sharedPreferencesProvider)
        .setString(PrefKeys.themeMode, mode.name);
    state = mode;
  }
}

final themeModeProvider = NotifierProvider<ThemeModeController, ThemeMode>(
  ThemeModeController.new,
);

class OnboardingController extends Notifier<bool> {
  @override
  bool build() =>
      ref.watch(sharedPreferencesProvider).getBool(PrefKeys.onboardingDone) ??
      false;

  Future<void> complete() async {
    await ref
        .read(sharedPreferencesProvider)
        .setBool(PrefKeys.onboardingDone, true);
    state = true;
  }
}

final onboardingDoneProvider = NotifierProvider<OnboardingController, bool>(
  OnboardingController.new,
);

/// City used for the "new finds nearby" block on the home screen (PRD §8.3).
/// Only an approximate reference id is stored — never device coordinates.
class PreferredCityController extends Notifier<String?> {
  @override
  String? build() =>
      ref.watch(sharedPreferencesProvider).getString(PrefKeys.preferredCity);

  Future<void> set(String? cityId) async {
    final prefs = ref.read(sharedPreferencesProvider);
    if (cityId == null) {
      await prefs.remove(PrefKeys.preferredCity);
    } else {
      await prefs.setString(PrefKeys.preferredCity, cityId);
    }
    state = cityId;
  }
}

final preferredCityProvider = NotifierProvider<PreferredCityController, String?>(
  PreferredCityController.new,
);

/// Recent search queries (PRD §8.6), most recent first, capped at 8.
class RecentSearchesController extends Notifier<List<String>> {
  @override
  List<String> build() =>
      ref.watch(sharedPreferencesProvider).getStringList(PrefKeys.recentSearches) ??
      const [];

  Future<void> add(String query) async {
    final q = query.trim();
    if (q.isEmpty) return;
    final next = [q, ...state.where((s) => s.toLowerCase() != q.toLowerCase())]
        .take(8)
        .toList();
    await ref
        .read(sharedPreferencesProvider)
        .setStringList(PrefKeys.recentSearches, next);
    state = next;
  }

  Future<void> clear() async {
    await ref.read(sharedPreferencesProvider).remove(PrefKeys.recentSearches);
    state = const [];
  }
}

final recentSearchesProvider =
    NotifierProvider<RecentSearchesController, List<String>>(
      RecentSearchesController.new,
    );

/// Small JSON cache for offline-first feeds (PRD §25.2).
class JsonCache {
  JsonCache(this._prefs);
  final SharedPreferences _prefs;

  Future<void> put(String key, Object value) =>
      _prefs.setString(key, jsonEncode(value));

  T? get<T>(String key) {
    final raw = _prefs.getString(key);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as T;
    } catch (_) {
      return null;
    }
  }

  Future<void> remove(String key) => _prefs.remove(key);
}

final jsonCacheProvider = Provider<JsonCache>(
  (ref) => JsonCache(ref.watch(sharedPreferencesProvider)),
);
