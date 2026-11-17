import 'package:flutter/foundation.dart';

/// Build-time configuration. Override with
/// `flutter run --dart-define=API_BASE_URL=https://api.example.kg`.
class AppConfig {
  static const String _definedBase = String.fromEnvironment('API_BASE_URL');

  /// Android emulator reaches the host machine via 10.0.2.2.
  static String get apiBaseUrl {
    // A web build hosted together with the API (one address) talks to its own origin.
    if (_definedBase == 'same-origin' && kIsWeb) return Uri.base.origin;
    if (_definedBase.isNotEmpty) return _definedBase;
    if (kIsWeb) return 'http://localhost:3001';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3001';
    }
    return 'http://localhost:3001';
  }

  static String get wsUrl => '${apiBaseUrl.replaceFirst('http', 'ws')}/ws';

  static const String termsVersion = '2026-11';
  static const String appVersion = '0.1.0';
}
