import 'package:dio/dio.dart';

/// Normalized API error: `code` is stable, `message` is already localized by the server.
class ApiError implements Exception {
  ApiError({
    required this.code,
    required this.message,
    required this.status,
    this.details,
    this.offline = false,
  });

  final String code;
  final String message;
  final int status;
  final dynamic details;
  final bool offline;

  bool get isUnauthorized => status == 401;
  bool get isForbidden => status == 403;
  bool get isNotFound => status == 404;
  bool get isRateLimited => status == 429;

  /// Server-provided state for unavailable items: content_removed | item_unavailable.
  String? get itemState => details is Map ? details['state'] as String? : null;

  factory ApiError.fromDio(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['code'] is String) {
      return ApiError(
        code: data['code'] as String,
        message: (data['message'] as String?) ?? '',
        status: e.response?.statusCode ?? 0,
        details: data['details'],
      );
    }
    final offline =
        e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout;
    return ApiError(
      code: offline ? 'error.offline' : 'error.internal',
      message: '',
      status: e.response?.statusCode ?? 0,
      offline: offline,
    );
  }

  @override
  String toString() => 'ApiError($code, $status)';
}
