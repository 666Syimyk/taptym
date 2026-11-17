import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../config.dart';
import '../storage/token_store.dart';
import 'api_error.dart';

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());

/// Locale sent as Accept-Language, kept in sync by the app shell.
final acceptLanguageProvider = StateProvider<String>((ref) => 'ru');

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 60),
      headers: {'Accept': 'application/json'},
    ),
  );
  dio.interceptors.add(_AuthInterceptor(ref, dio));
  return dio;
});

/// Attaches the access token, sets Accept-Language and transparently refreshes once on 401.
class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this.ref, this.dio);
  final Ref ref;
  final Dio dio;
  Future<bool>? _refreshing;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    options.headers['Accept-Language'] = ref.read(acceptLanguageProvider);
    final token = await ref.read(tokenStoreProvider).accessToken();
    if (token != null &&
        options.headers['Authorization'] == null &&
        options.extra['anonymous'] != true) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final status = err.response?.statusCode;
    final isAuthRoute = err.requestOptions.path.startsWith('/v1/auth/');
    if (status == 401 &&
        !isAuthRoute &&
        err.requestOptions.extra['retried'] != true) {
      final ok = await (_refreshing ??= _refresh().whenComplete(
        () => _refreshing = null,
      ));
      if (ok) {
        final opts = err.requestOptions;
        opts.extra['retried'] = true;
        final token = await ref.read(tokenStoreProvider).accessToken();
        opts.headers['Authorization'] = 'Bearer $token';
        try {
          final response = await dio.fetch(opts);
          return handler.resolve(response);
        } catch (e) {
          if (e is DioException) return handler.next(e);
          rethrow;
        }
      }
    }
    handler.next(err);
  }

  Future<bool> _refresh() async {
    final store = ref.read(tokenStoreProvider);
    final refresh = await store.refreshToken();
    if (refresh == null) return false;
    try {
      final res = await dio.post(
        '/v1/auth/refresh',
        data: {'refreshToken': refresh},
        options: Options(extra: {'anonymous': true}),
      );
      await store.save(
        res.data['accessToken'] as String,
        res.data['refreshToken'] as String,
        res.data['userId'] as String,
      );
      return true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        await store.clear();
      }
      return false;
    }
  }
}

/// Thin wrapper exposing typed errors.
class ApiClient {
  ApiClient(this._dio);
  final Dio _dio;

  Future<T> get<T>(String path, {Map<String, dynamic>? query}) =>
      _run(() => _dio.get<T>(path, queryParameters: query));
  Future<T> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? headers,
  }) => _run(
    () => _dio.post<T>(
      path,
      data: data,
      options: Options(headers: headers),
    ),
  );
  Future<T> patch<T>(String path, {Object? data}) =>
      _run(() => _dio.patch<T>(path, data: data));
  Future<T> put<T>(String path, {Object? data}) =>
      _run(() => _dio.put<T>(path, data: data));
  Future<T> delete<T>(String path) => _run(() => _dio.delete<T>(path));
  Future<T> upload<T>(
    String path,
    FormData form, {
    Map<String, dynamic>? query,
  }) => _run(() => _dio.post<T>(path, data: form, queryParameters: query));

  Future<T> _run<T>(Future<Response<T>> Function() fn) async {
    try {
      final res = await fn();
      return res.data as T;
    } on DioException catch (e) {
      throw ApiError.fromDio(e);
    }
  }
}

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(ref.watch(dioProvider)),
);
