import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'models.dart';
import 'network/api_client.dart';
import 'storage/prefs.dart';

/// Reference data, cached in prefs for offline use.
class CatalogRepository {
  CatalogRepository(this._api, this._cache);
  final ApiClient _api;
  final JsonCache _cache;

  Future<List<Category>> categories() async {
    try {
      final data = await _api.get<List<dynamic>>('/v1/categories');
      await _cache.put('ref_categories', data);
      return data
          .map((e) => Category.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      final cached = _cache.get<List<dynamic>>('ref_categories');
      if (cached != null) {
        return cached
            .map((e) => Category.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
      }
      rethrow;
    }
  }

  /// Nearest district for the device position; the server keeps no coordinates.
  Future<String?> resolveLocation(double lat, double lng) async {
    final data = await _api.get<Map<String, dynamic>>('/v1/locations/resolve', query: {'lat': '$lat', 'lng': '$lng'});
    return data['locationId'] as String?;
  }

  Future<List<Location>> locations() async {
    try {
      final data = await _api.get<List<dynamic>>('/v1/locations');
      await _cache.put('ref_locations', data);
      return data
          .map((e) => Location.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      final cached = _cache.get<List<dynamic>>('ref_locations');
      if (cached != null) {
        return cached
            .map((e) => Location.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
      }
      rethrow;
    }
  }
}

class ItemsQuery {
  const ItemsQuery({
    this.type,
    this.categoryId,
    this.locationId,
    this.color,
    this.q,
    this.sort,
    this.withReward = false,
  });
  final String? type, categoryId, locationId, color, q, sort;
  final bool withReward;

  ItemsQuery copyWith({
    String? type,
    String? categoryId,
    String? locationId,
    String? color,
    String? q,
    String? sort,
    bool? withReward,
    bool clearCategory = false,
    bool clearLocation = false,
    bool clearColor = false,
  }) => ItemsQuery(
    type: type ?? this.type,
    categoryId: clearCategory ? null : (categoryId ?? this.categoryId),
    locationId: clearLocation ? null : (locationId ?? this.locationId),
    color: clearColor ? null : (color ?? this.color),
    q: q ?? this.q,
    sort: sort ?? this.sort,
    withReward: withReward ?? this.withReward,
  );

  bool get hasFilters =>
      categoryId != null || locationId != null || color != null || withReward;

  Map<String, dynamic> toParams({String? cursor, int limit = 20}) => {
    if (type != null) 'type': type,
    if (categoryId != null) 'categoryId': categoryId,
    if (locationId != null) 'locationId': locationId,
    if (color != null) 'color': color,
    if (q != null && q!.trim().isNotEmpty) 'q': q!.trim(),
    if (sort != null) 'sort': sort,
    if (withReward) 'withReward': 'true',
    'cursor': ?cursor,
    'limit': '$limit',
  };

  String get cacheKey => '${PrefKeys.feedCache}${type ?? 'all'}';

  @override
  bool operator ==(Object other) =>
      other is ItemsQuery &&
      other.toParams().toString() == toParams().toString();
  @override
  int get hashCode => toParams().toString().hashCode;
}

class ItemsRepository {
  ItemsRepository(this._api, this._cache);
  final ApiClient _api;
  final JsonCache _cache;

  Future<Page<Item>> list(ItemsQuery q, {String? cursor}) async {
    try {
      final data = await _api.get<Map<String, dynamic>>(
        '/v1/items',
        query: q.toParams(cursor: cursor),
      );
      if (cursor == null && !q.hasFilters && (q.q ?? '').isEmpty) {
        await _cache.put(q.cacheKey, data);
      }
      return _page(data);
    } catch (e) {
      if (cursor == null && !q.hasFilters && (q.q ?? '').isEmpty) {
        final cached = _cache.get<Map<String, dynamic>>(q.cacheKey);
        if (cached != null) return _page(cached, fromCache: true);
      }
      rethrow;
    }
  }

  Page<Item> _page(Map<String, dynamic> data, {bool fromCache = false}) => Page(
    items: (data['items'] as List)
        .map((e) => Item.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList(),
    nextCursor: fromCache ? null : data['nextCursor'] as String?,
    fromCache: fromCache,
  );

  Future<List<String>> suggest(String q) async {
    final data = await _api.get<List<dynamic>>(
      '/v1/items/suggest',
      query: {'q': q},
    );
    return data.map((e) => e.toString()).toList();
  }

  Future<Item> detail(String id) async =>
      Item.fromJson(await _api.get<Map<String, dynamic>>('/v1/items/$id'));

  Future<({Item item, int matchesCount})> create(
    Map<String, dynamic> body, {
    required String idempotencyKey,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/v1/items',
      data: body,
      headers: {'Idempotency-Key': idempotencyKey},
    );
    return (
      item: Item.fromJson(Map<String, dynamic>.from(data['item'] as Map)),
      matchesCount: (data['matchesCount'] as num?)?.toInt() ?? 0,
    );
  }

  Future<Item> update(String id, Map<String, dynamic> patch) async =>
      Item.fromJson(
        await _api.patch<Map<String, dynamic>>('/v1/items/$id', data: patch),
      );
  Future<Item> close(String id, String resolution) async => Item.fromJson(
    await _api.post<Map<String, dynamic>>(
      '/v1/items/$id/close',
      data: {'resolution': resolution},
    ),
  );
  Future<void> remove(String id) => _api.delete<void>('/v1/items/$id');

  Future<List<Item>> mine() async {
    final data = await _api.get<List<dynamic>>('/v1/me/items');
    return data
        .map((e) => Item.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<List<MatchSuggestion>> matches(String itemId) async {
    final data = await _api.get<List<dynamic>>('/v1/items/$itemId/matches');
    return data
        .map(
          (e) => MatchSuggestion.fromJson(Map<String, dynamic>.from(e as Map)),
        )
        .toList();
  }

  Future<void> dismissMatch(String itemId, String matchId) =>
      _api.post<void>('/v1/items/$itemId/matches/$matchId/dismiss');
}

class MediaRepository {
  MediaRepository(this._api);
  final ApiClient _api;

  Future<UploadedMedia> upload(
    Uint8List bytes, {
    String filename = 'photo.jpg',
    String? categorySlug,
    bool suggestions = true,
    String? listingType,
  }) async {
    final session = await _api.post<Map<String, dynamic>>(
      '/v1/media/upload-session',
    );
    final id = session['mediaId'] as String;
    final form = FormData.fromMap({
      'file': MultipartFile.fromBytes(bytes, filename: filename),
    });
    final data = await _api.upload<Map<String, dynamic>>(
      '/v1/media/$id/upload',
      form,
      query: {
        'categorySlug': ?categorySlug,
        'suggestions': suggestions ? 'true' : 'false',
        'listingType': ?listingType,
      },
    );
    return UploadedMedia.fromJson(data);
  }
}

class ClaimsRepository {
  ClaimsRepository(this._api);
  final ApiClient _api;

  Future<Claim> create(
    String itemId, {
    String? message,
    required List<Map<String, dynamic>> evidence,
  }) async => Claim.fromJson(
    await _api.post<Map<String, dynamic>>(
      '/v1/items/$itemId/claims',
      data: {'message': message, 'evidence': evidence},
    ),
  );
  Future<Claim> get(String id) async =>
      Claim.fromJson(await _api.get<Map<String, dynamic>>('/v1/claims/$id'));
  Future<Claim> decide(String id, String decision, {String? note}) async =>
      Claim.fromJson(
        await _api.post<Map<String, dynamic>>(
          '/v1/claims/$id/decision',
          data: {
            'decision': decision,
            if (note != null && note.isNotEmpty) 'note': note,
          },
        ),
      );
  Future<Claim> withdraw(String id) async => Claim.fromJson(
    await _api.post<Map<String, dynamic>>('/v1/claims/$id/withdraw'),
  );
  Future<Claim> addEvidence(
    String id,
    List<Map<String, dynamic>> evidence,
  ) async => Claim.fromJson(
    await _api.post<Map<String, dynamic>>(
      '/v1/claims/$id/evidence',
      data: {'evidence': evidence},
    ),
  );
  Future<Claim> dispute(String id) async => Claim.fromJson(
    await _api.post<Map<String, dynamic>>('/v1/claims/$id/dispute'),
  );
  Future<List<Claim>> mine() async =>
      (await _api.get<List<dynamic>>('/v1/me/claims'))
          .map((e) => Claim.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
  Future<List<Claim>> incoming() async =>
      (await _api.get<List<dynamic>>('/v1/me/claims/incoming'))
          .map((e) => Claim.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
  Future<List<Claim>> forItem(String itemId) async =>
      (await _api.get<List<dynamic>>('/v1/items/$itemId/claims'))
          .map((e) => Claim.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
}

class MessagingRepository {
  MessagingRepository(this._api);
  final ApiClient _api;

  Future<List<Conversation>> list() async =>
      (await _api.get<List<dynamic>>('/v1/conversations'))
          .map(
            (e) => Conversation.fromJson(Map<String, dynamic>.from(e as Map)),
          )
          .toList();
  Future<int> unread() async =>
      ((await _api.get<Map<String, dynamic>>(
                '/v1/conversations/unread-count',
              ))['count']
              as num)
          .toInt();
  Future<({List<Message> items, bool hasMore})> history(
    String id, {
    String? before,
    String? after,
    String? myId,
  }) async {
    final data = await _api.get<Map<String, dynamic>>(
      '/v1/conversations/$id/messages',
      query: {'before': ?before, 'after': ?after, 'limit': '50'},
    );
    return (
      items: (data['items'] as List)
          .map(
            (e) => Message.fromJson(
              Map<String, dynamic>.from(e as Map),
              myId: myId,
            ),
          )
          .toList(),
      hasMore: data['hasMore'] == true,
    );
  }

  Future<Message> send(
    String id, {
    required String body,
    required String clientMessageId,
    String? attachmentMediaId,
  }) async => Message.fromJson(
    await _api.post<Map<String, dynamic>>(
      '/v1/conversations/$id/messages',
      data: {
        'body': body,
        'clientMessageId': clientMessageId,
        'attachmentMediaId': ?attachmentMediaId,
      },
    ),
  );
  Future<void> markRead(String id, String messageId) => _api.post<void>(
    '/v1/conversations/$id/read',
    data: {'messageId': messageId},
  );
  Future<void> close(String id) =>
      _api.post<void>('/v1/conversations/$id/close');
}

class HandoffsRepository {
  HandoffsRepository(this._api);
  final ApiClient _api;
  Future<Handoff> create(
    String claimId, {
    required String method,
    String? placeNote,
  }) async => Handoff.fromJson(
    await _api.post<Map<String, dynamic>>(
      '/v1/handoffs',
      data: {
        'claimId': claimId,
        'method': method,
        if (placeNote != null && placeNote.isNotEmpty) 'placeNote': placeNote,
      },
    ),
  );
  Future<Handoff?> forClaim(String claimId) async {
    final data = await _api.get<dynamic>('/v1/claims/$claimId/handoff');
    return data is Map
        ? Handoff.fromJson(Map<String, dynamic>.from(data))
        : null;
  }

  Future<Handoff> confirm(String id, {String? code}) async => Handoff.fromJson(
    await _api.post<Map<String, dynamic>>(
      '/v1/handoffs/$id/confirm',
      data: {if (code != null && code.isNotEmpty) 'code': code},
    ),
  );
  Future<Handoff> dispute(String id) async => Handoff.fromJson(
    await _api.post<Map<String, dynamic>>('/v1/handoffs/$id/dispute'),
  );
}

class AccountRepository {
  AccountRepository(this._api);
  final ApiClient _api;
  Future<Me> me() async =>
      Me.fromJson(await _api.get<Map<String, dynamic>>('/v1/me'));
  Future<Me> update(Map<String, dynamic> patch) async => Me.fromJson(
    await _api.patch<Map<String, dynamic>>('/v1/me', data: patch),
  );
  Future<void> deleteAccount() => _api.delete<void>('/v1/me');
  Future<void> logout() => _api.post<void>('/v1/auth/logout');
  Future<void> revokeAll() => _api.post<void>('/v1/me/sessions/revoke-all');
  Future<void> block(String userId) =>
      _api.post<void>('/v1/users/$userId/block');
  Future<void> consent(String type, String version) => _api.post<void>(
    '/v1/me/consents',
    data: {'consentType': type, 'version': version, 'granted': true},
  );
  Future<void> report({
    required String targetType,
    required String targetId,
    required String reason,
    String? details,
  }) => _api.post<void>(
    '/v1/reports',
    data: {
      'targetType': targetType,
      'targetId': targetId,
      'reason': reason,
      if (details != null && details.isNotEmpty) 'details': details,
    },
  );
  Future<List<AppNotification>> notifications() async {
    final data = await _api.get<Map<String, dynamic>>('/v1/notifications');
    return (data['items'] as List)
        .map(
          (e) => AppNotification.fromJson(Map<String, dynamic>.from(e as Map)),
        )
        .toList();
  }

  Future<int> unreadNotifications() async =>
      ((await _api.get<Map<String, dynamic>>(
                '/v1/notifications/unread-count',
              ))['count']
              as num)
          .toInt();
  Future<void> readNotification(String id) =>
      _api.post<void>('/v1/notifications/$id/read');
  Future<void> readAllNotifications() =>
      _api.post<void>('/v1/notifications/read-all');
  Future<void> track(List<Map<String, dynamic>> events, String anonymousId) =>
      _api.post<void>(
        '/v1/analytics/events',
        data: {'events': events, 'anonymousId': anonymousId},
      );
}

final catalogRepositoryProvider = Provider(
  (ref) => CatalogRepository(
    ref.watch(apiClientProvider),
    ref.watch(jsonCacheProvider),
  ),
);
final itemsRepositoryProvider = Provider(
  (ref) => ItemsRepository(
    ref.watch(apiClientProvider),
    ref.watch(jsonCacheProvider),
  ),
);
final mediaRepositoryProvider = Provider(
  (ref) => MediaRepository(ref.watch(apiClientProvider)),
);
final claimsRepositoryProvider = Provider(
  (ref) => ClaimsRepository(ref.watch(apiClientProvider)),
);
final messagingRepositoryProvider = Provider(
  (ref) => MessagingRepository(ref.watch(apiClientProvider)),
);
final handoffsRepositoryProvider = Provider(
  (ref) => HandoffsRepository(ref.watch(apiClientProvider)),
);
final accountRepositoryProvider = Provider(
  (ref) => AccountRepository(ref.watch(apiClientProvider)),
);

final categoriesProvider = FutureProvider<List<Category>>(
  (ref) => ref.watch(catalogRepositoryProvider).categories(),
);
final locationsProvider = FutureProvider<List<Location>>(
  (ref) => ref.watch(catalogRepositoryProvider).locations(),
);
