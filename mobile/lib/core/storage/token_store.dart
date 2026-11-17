import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Tokens live in the platform keystore/keychain (PRD §22.1).
class TokenStore {
  TokenStore([FlutterSecureStorage? storage])
    : _storage =
          storage ??
          const FlutterSecureStorage(
            aOptions: AndroidOptions(),
            iOptions: IOSOptions(
              accessibility: KeychainAccessibility.first_unlock_this_device,
            ),
          );

  final FlutterSecureStorage _storage;
  static const _kAccess = 'access_token';
  static const _kRefresh = 'refresh_token';
  static const _kUser = 'user_id';

  String? _cachedAccess;
  bool _loaded = false;

  Future<String?> accessToken() async {
    if (!_loaded) {
      _cachedAccess = await _storage.read(key: _kAccess);
      _loaded = true;
    }
    return _cachedAccess;
  }

  Future<String?> refreshToken() => _storage.read(key: _kRefresh);
  Future<String?> userId() => _storage.read(key: _kUser);

  Future<void> save(String access, String refresh, String userId) async {
    _cachedAccess = access;
    _loaded = true;
    await _storage.write(key: _kAccess, value: access);
    await _storage.write(key: _kRefresh, value: refresh);
    await _storage.write(key: _kUser, value: userId);
  }

  Future<void> clear() async {
    _cachedAccess = null;
    _loaded = true;
    await _storage.delete(key: _kAccess);
    await _storage.delete(key: _kRefresh);
    await _storage.delete(key: _kUser);
  }
}
