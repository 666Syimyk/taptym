/// Plain immutable models mapped from API JSON. Kept dependency-free so the
/// domain layer never imports Flutter or Dio.
library;

String? _s(dynamic v) => v?.toString();

/// Reference names come in Russian and Kyrgyz; English falls back to Russian.
String _pick(String locale, String ru, String ky, String? en) => switch (locale) {
  'ky' => ky,
  'en' => en ?? ru,
  _ => ru,
};
int? _i(dynamic v) =>
    v is int ? v : (v is num ? v.toInt() : int.tryParse('$v'));
DateTime? _dt(dynamic v) =>
    v == null ? null : DateTime.tryParse(v.toString())?.toLocal();
List<T> _list<T>(dynamic v, T Function(Map<String, dynamic>) f) => v is List
    ? v.whereType<Map>().map((e) => f(Map<String, dynamic>.from(e))).toList()
    : <T>[];

class Category {
  const Category({
    required this.id,
    required this.slug,
    required this.nameRu,
    required this.nameKy,
    this.nameEn,
    required this.icon,
    required this.sensitive,
    required this.publicationPolicy,
  });
  final String id, slug, nameRu, nameKy, icon, publicationPolicy;
  final String? nameEn;
  final bool sensitive;
  bool get photoRestricted => publicationPolicy == 'restricted_photo';
  String name(String locale) => _pick(locale, nameRu, nameKy, nameEn);

  factory Category.fromJson(Map<String, dynamic> j) => Category(
    id: j['id'] as String,
    slug: j['slug'] as String,
    nameRu: j['nameRu'] as String,
    nameKy: j['nameKy'] as String,
    nameEn: _s(j['nameEn']),
    icon: (j['icon'] as String?) ?? 'tag',
    sensitive: j['sensitive'] == true,
    publicationPolicy: (j['publicationPolicy'] as String?) ?? 'standard',
  );
  Map<String, dynamic> toJson() => {
    'id': id,
    'slug': slug,
    'nameRu': nameRu,
    'nameKy': nameKy,
    'nameEn': nameEn,
    'icon': icon,
    'sensitive': sensitive,
    'publicationPolicy': publicationPolicy,
  };
}

class Location {
  const Location({
    required this.id,
    this.parentId,
    required this.kind,
    required this.nameRu,
    required this.nameKy,
    this.nameEn,
  });
  final String id, kind, nameRu, nameKy;
  final String? parentId, nameEn;
  String name(String locale) => _pick(locale, nameRu, nameKy, nameEn);
  factory Location.fromJson(Map<String, dynamic> j) => Location(
    id: j['id'] as String,
    parentId: _s(j['parentId']),
    kind: j['kind'] as String,
    nameRu: j['nameRu'] as String,
    nameKy: j['nameKy'] as String,
    nameEn: _s(j['nameEn']),
  );
  Map<String, dynamic> toJson() => {
    'id': id,
    'parentId': parentId,
    'kind': kind,
    'nameRu': nameRu,
    'nameKy': nameKy,
    'nameEn': nameEn,
  };
}

class MediaRef {
  const MediaRef({
    required this.id,
    this.publicUrl,
    this.thumbUrl,
    this.width,
    this.height,
  });
  final String id;
  final String? publicUrl, thumbUrl;
  final int? width, height;
  factory MediaRef.fromJson(Map<String, dynamic> j) => MediaRef(
    id: j['id'] as String,
    publicUrl: _s(j['publicUrl']),
    thumbUrl: _s(j['thumbUrl']),
    width: _i(j['width']),
    height: _i(j['height']),
  );
  Map<String, dynamic> toJson() => {
    'id': id,
    'publicUrl': publicUrl,
    'thumbUrl': thumbUrl,
    'width': width,
    'height': height,
  };
}

class UploadedMedia {
  const UploadedMedia({
    required this.id,
    required this.status,
    this.publicUrl,
    this.thumbUrl,
    this.suggestions,
  });
  final String id, status;
  final String? publicUrl, thumbUrl;
  final Map<String, dynamic>? suggestions;
  bool get blocked => status == 'BLOCKED_SENSITIVE';
  bool get unchecked => status == 'READY_UNCHECKED';
  bool get ready => status == 'READY' || unchecked;
  factory UploadedMedia.fromJson(Map<String, dynamic> j) => UploadedMedia(
    id: j['id'] as String,
    status: j['status'] as String,
    publicUrl: _s(j['publicUrl']),
    thumbUrl: _s(j['thumbUrl']),
    suggestions: j['suggestions'] is Map
        ? Map<String, dynamic>.from(j['suggestions'] as Map)
        : null,
  );
}

class ItemLocation {
  const ItemLocation({
    required this.id,
    required this.nameRu,
    required this.nameKy,
    this.parentNameRu,
    this.parentNameKy,
    this.nameEn,
    this.parentNameEn,
  });
  final String id, nameRu, nameKy;
  final String? parentNameRu, parentNameKy, nameEn, parentNameEn;
  String label(String locale) {
    final n = _pick(locale, nameRu, nameKy, nameEn);
    final p = parentNameRu == null
        ? null
        : _pick(locale, parentNameRu!, parentNameKy ?? parentNameRu!, parentNameEn);
    return p == null ? n : '$p, $n';
  }

  factory ItemLocation.fromJson(Map<String, dynamic> j) => ItemLocation(
    id: j['id'] as String,
    nameRu: j['nameRu'] as String,
    nameKy: j['nameKy'] as String,
    parentNameRu: _s(j['parentNameRu']),
    parentNameKy: _s(j['parentNameKy']),
    nameEn: _s(j['nameEn']),
    parentNameEn: _s(j['parentNameEn']),
  );
}

class Reward {
  const Reward({this.amount, required this.currency, this.note});
  final int? amount;
  final String currency;
  final String? note;
  factory Reward.fromJson(Map<String, dynamic> j) => Reward(
    amount: _i(j['amount']),
    currency: (j['currency'] as String?) ?? 'KGS',
    note: _s(j['note']),
  );
}

class Owner {
  const Owner({
    required this.id,
    required this.publicName,
    required this.trustLevel,
  });
  final String id, publicName, trustLevel;
  factory Owner.fromJson(Map<String, dynamic> j) => Owner(
    id: j['id'] as String,
    publicName: (j['publicName'] as String?) ?? '',
    trustLevel: (j['trustLevel'] as String?) ?? 'Guest',
  );
}

class Item {
  const Item({
    required this.id,
    required this.listingType,
    required this.status,
    required this.title,
    required this.description,
    required this.category,
    this.color,
    this.brand,
    this.size,
    this.location,
    this.eventTimeStart,
    this.eventTimeEnd,
    this.reward,
    required this.media,
    required this.owner,
    required this.createdAt,
    this.publishedAt,
    required this.isOwner,
    this.hiddenFeatures,
    this.contactPhone,
    this.moderationNote,
    this.pendingClaims = 0,
    this.raw,
  });

  final String id, listingType, status, title, description;
  final Category category;
  final String? color, brand, size;
  final ItemLocation? location;
  final DateTime? eventTimeStart, eventTimeEnd, publishedAt;
  final Reward? reward;
  final List<MediaRef> media;
  final Owner owner;
  final DateTime createdAt;
  final bool isOwner;
  final List<String>? hiddenFeatures;

  /// Private listing phone — present only in the author's own view.
  final String? contactPhone;
  final String? moderationNote;
  final int pendingClaims;
  final Map<String, dynamic>? raw;

  bool get isLost => listingType == 'LOST';
  bool get isFound => listingType == 'FOUND';
  MediaRef? get cover => media.isEmpty ? null : media.first;

  factory Item.fromJson(Map<String, dynamic> j) => Item(
    id: j['id'] as String,
    listingType: j['listingType'] as String,
    status: j['status'] as String,
    title: j['title'] as String,
    description: (j['description'] as String?) ?? '',
    category: Category.fromJson(
      Map<String, dynamic>.from(j['category'] as Map),
    ),
    color: _s(j['color']),
    brand: _s(j['brand']),
    size: _s(j['size']),
    location: j['location'] is Map
        ? ItemLocation.fromJson(Map<String, dynamic>.from(j['location'] as Map))
        : null,
    eventTimeStart: _dt(j['eventTimeStart']),
    eventTimeEnd: _dt(j['eventTimeEnd']),
    reward: j['reward'] is Map
        ? Reward.fromJson(Map<String, dynamic>.from(j['reward'] as Map))
        : null,
    media: _list(j['media'], MediaRef.fromJson),
    owner: Owner.fromJson(Map<String, dynamic>.from(j['owner'] as Map)),
    createdAt: _dt(j['createdAt']) ?? DateTime.now(),
    publishedAt: _dt(j['publishedAt']),
    isOwner: j['isOwner'] == true,
    hiddenFeatures: j['hiddenFeatures'] is List
        ? List<String>.from(j['hiddenFeatures'] as List)
        : null,
    contactPhone: _s(j['contactPhone']),
    moderationNote: _s(j['moderationNote']),
    pendingClaims: _i(j['pendingClaims']) ?? 0,
    raw: j,
  );
}

class Page<T> {
  const Page({required this.items, this.nextCursor, this.fromCache = false});
  final List<T> items;
  final String? nextCursor;

  /// True when the data came from the offline cache (PRD §25.2).
  final bool fromCache;
}

class MatchSuggestion {
  const MatchSuggestion({
    required this.id,
    required this.itemId,
    required this.listingType,
    required this.title,
    this.thumbUrl,
    this.locationNameRu,
    this.locationNameKy,
    this.locationNameEn,
    this.eventTimeStart,
    required this.reasons,
    required this.status,
  });
  final String id, itemId, listingType, title, status;
  final String? thumbUrl, locationNameRu, locationNameKy, locationNameEn;
  String? locationName(String locale) => switch (locale) {
    'ky' => locationNameKy,
    'en' => locationNameEn ?? locationNameRu,
    _ => locationNameRu,
  };
  final DateTime? eventTimeStart;
  final List<String> reasons;
  factory MatchSuggestion.fromJson(Map<String, dynamic> j) => MatchSuggestion(
    id: j['id'] as String,
    itemId: j['itemId'] as String,
    listingType: j['listingType'] as String,
    title: j['title'] as String,
    thumbUrl: _s(j['thumbUrl']),
    locationNameRu: _s(j['locationNameRu']),
    locationNameKy: _s(j['locationNameKy']),
    locationNameEn: _s(j['locationNameEn']),
    eventTimeStart: _dt(j['eventTimeStart']),
    reasons: List<String>.from((j['reasons'] as List?) ?? const []),
    status: (j['status'] as String?) ?? 'NEW',
  );
}

class Evidence {
  const Evidence({
    required this.id,
    required this.type,
    this.text,
    required this.hasAttachment,
    this.attachmentUrl,
    required this.createdAt,
  });
  final String id, type;
  final String? text, attachmentUrl;
  final bool hasAttachment;
  final DateTime createdAt;
  factory Evidence.fromJson(Map<String, dynamic> j) => Evidence(
    id: j['id'] as String,
    type: j['type'] as String,
    text: _s(j['text']),
    hasAttachment: j['hasAttachment'] == true,
    attachmentUrl: _s(j['attachmentUrl']),
    createdAt: _dt(j['createdAt']) ?? DateTime.now(),
  );
}

class Claim {
  const Claim({
    required this.id,
    required this.itemId,
    required this.itemTitle,
    required this.itemType,
    required this.kind,
    required this.status,
    this.message,
    this.decisionNote,
    required this.claimantName,
    required this.isClaimant,
    required this.isItemOwner,
    required this.evidence,
    this.conversationId,
    this.contactPhone,
    required this.submittedAt,
    required this.intro,
  });
  final String id,
      itemId,
      itemTitle,
      itemType,
      kind,
      status,
      claimantName,
      intro;
  final String? message, decisionNote, conversationId;

  /// Listing author's phone, sent to the claimant only after their claim is approved.
  final String? contactPhone;
  final bool isClaimant, isItemOwner;
  final List<Evidence> evidence;
  final DateTime submittedAt;
  bool get isActive => !['REJECTED', 'WITHDRAWN', 'COMPLETED'].contains(status);
  factory Claim.fromJson(Map<String, dynamic> j) => Claim(
    id: j['id'] as String,
    itemId: j['itemId'] as String,
    itemTitle: (j['itemTitle'] as String?) ?? '',
    itemType: (j['itemType'] as String?) ?? 'FOUND',
    kind: (j['kind'] as String?) ?? 'OWNERSHIP',
    status: j['status'] as String,
    message: _s(j['message']),
    decisionNote: _s(j['decisionNote']),
    claimantName:
        (j['claimant'] is Map
            ? _s((j['claimant'] as Map)['publicName'])
            : null) ??
        '',
    isClaimant: j['isClaimant'] == true,
    isItemOwner: j['isItemOwner'] == true,
    evidence: _list(j['evidence'], Evidence.fromJson),
    conversationId: _s(j['conversationId']),
    contactPhone: _s(j['contactPhone']),
    submittedAt: _dt(j['submittedAt']) ?? DateTime.now(),
    intro: (j['intro'] as String?) ?? '',
  );
}

class Message {
  const Message({
    required this.id,
    required this.conversationId,
    this.senderId,
    this.clientMessageId,
    required this.kind,
    required this.body,
    this.attachmentUrl,
    required this.warnings,
    required this.createdAt,
    required this.mine,
    this.pending = false,
  });
  final String id, conversationId, kind, body;
  final String? senderId, clientMessageId, attachmentUrl;
  final List<String> warnings;
  final DateTime createdAt;
  final bool mine, pending;
  bool get isSystem => senderId == null;
  factory Message.fromJson(Map<String, dynamic> j, {String? myId}) => Message(
    id: j['id'] as String,
    conversationId: j['conversationId'] as String,
    senderId: _s(j['senderId']),
    clientMessageId: _s(j['clientMessageId']),
    kind: (j['kind'] as String?) ?? 'text',
    body: (j['body'] as String?) ?? '',
    attachmentUrl: _s(j['attachmentUrl']),
    warnings: List<String>.from((j['warnings'] as List?) ?? const []),
    createdAt: _dt(j['createdAt']) ?? DateTime.now(),
    mine: j['mine'] == true || (myId != null && j['senderId'] == myId),
  );
  Message copyWith({bool? pending, String? id}) => Message(
    id: id ?? this.id,
    conversationId: conversationId,
    senderId: senderId,
    clientMessageId: clientMessageId,
    kind: kind,
    body: body,
    attachmentUrl: attachmentUrl,
    warnings: warnings,
    createdAt: createdAt,
    mine: mine,
    pending: pending ?? this.pending,
  );
}

class Conversation {
  const Conversation({
    required this.id,
    required this.itemId,
    required this.itemTitle,
    required this.itemType,
    this.claimId,
    required this.status,
    required this.otherId,
    required this.otherName,
    this.lastMessage,
    required this.unreadCount,
  });
  final String id, itemId, itemTitle, itemType, status, otherId, otherName;
  final String? claimId;
  final Message? lastMessage;
  final int unreadCount;
  factory Conversation.fromJson(Map<String, dynamic> j) => Conversation(
    id: j['id'] as String,
    itemId: j['itemId'] as String,
    itemTitle: (j['itemTitle'] as String?) ?? '',
    itemType: (j['itemType'] as String?) ?? 'FOUND',
    claimId: _s(j['claimId']),
    status: (j['status'] as String?) ?? 'ACTIVE',
    otherId:
        (j['otherParticipant'] is Map
            ? _s((j['otherParticipant'] as Map)['id'])
            : null) ??
        '',
    otherName:
        (j['otherParticipant'] is Map
            ? _s((j['otherParticipant'] as Map)['publicName'])
            : null) ??
        '',
    lastMessage: j['lastMessage'] is Map
        ? Message.fromJson(Map<String, dynamic>.from(j['lastMessage'] as Map))
        : null,
    unreadCount: _i(j['unreadCount']) ?? 0,
  );
}

class Handoff {
  const Handoff({
    required this.id,
    required this.itemId,
    required this.itemTitle,
    required this.claimId,
    required this.state,
    required this.method,
    this.placeNote,
    required this.myRole,
    required this.iConfirmed,
    required this.otherConfirmed,
    this.confirmationCode,
    this.expiresAt,
    required this.disclaimer,
  });
  final String id,
      itemId,
      itemTitle,
      claimId,
      state,
      method,
      myRole,
      disclaimer;
  final String? placeNote, confirmationCode;
  final bool iConfirmed, otherConfirmed;
  final DateTime? expiresAt;
  bool get completed => state == 'COMPLETED';
  bool get isHolder => myRole == 'holder';
  factory Handoff.fromJson(Map<String, dynamic> j) => Handoff(
    id: j['id'] as String,
    itemId: j['itemId'] as String,
    itemTitle: (j['itemTitle'] as String?) ?? '',
    claimId: j['claimId'] as String,
    state: j['state'] as String,
    method: (j['method'] as String?) ?? 'meeting',
    placeNote: _s(j['placeNote']),
    myRole: (j['myRole'] as String?) ?? 'receiver',
    iConfirmed: j['iConfirmed'] == true,
    otherConfirmed: j['otherConfirmed'] == true,
    confirmationCode: _s(j['confirmationCode']),
    expiresAt: _dt(j['expiresAt']),
    disclaimer: (j['disclaimer'] as String?) ?? '',
  );
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.deepLink,
    this.readAt,
    required this.createdAt,
  });
  final String id, type, title, body;
  final String? deepLink;
  final DateTime? readAt;
  final DateTime createdAt;
  bool get unread => readAt == null;
  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
    id: j['id'] as String,
    type: j['type'] as String,
    title: (j['title'] as String?) ?? '',
    body: (j['body'] as String?) ?? '',
    deepLink: _s(j['deepLink']),
    readAt: _dt(j['readAt']),
    createdAt: _dt(j['createdAt']) ?? DateTime.now(),
  );
}

class Me {
  const Me({
    required this.id,
    required this.publicName,
    required this.locale,
    required this.accountStatus,
    required this.trustLevel,
    required this.notificationPrefs,
    required this.contacts,
    required this.activeItems,
  });
  final String id, publicName, locale, accountStatus, trustLevel;
  final Map<String, bool> notificationPrefs;
  final List<({String channel, String masked})> contacts;
  final int activeItems;

  /// Device guest account: works fully, but has no verified phone/email yet.
  bool get isGuest => trustLevel == 'Guest';
  factory Me.fromJson(Map<String, dynamic> j) => Me(
    id: j['id'] as String,
    publicName: (j['publicName'] as String?) ?? '',
    locale: (j['locale'] as String?) ?? 'ru',
    accountStatus: (j['accountStatus'] as String?) ?? 'ACTIVE',
    trustLevel: (j['trustLevel'] as String?) ?? 'ContactVerified',
    notificationPrefs: (j['notificationPrefs'] is Map)
        ? Map<String, bool>.from(
            (j['notificationPrefs'] as Map).map(
              (k, v) => MapEntry('$k', v == true),
            ),
          )
        : {},
    contacts: j['contacts'] is List
        ? (j['contacts'] as List)
              .whereType<Map>()
              .map(
                (c) => (channel: '${c['channel']}', masked: '${c['masked']}'),
              )
              .toList()
        : const [],
    activeItems:
        _i(j['stats'] is Map ? (j['stats'] as Map)['activeItems'] : null) ?? 0,
  );
}
