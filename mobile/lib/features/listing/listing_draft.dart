import '../../core/models.dart';
import '../common.dart';

/// Mutable wizard state for a new or edited listing. Only non-sensitive fields are
/// persisted between launches (PRD §9.3 / §25.2); photo bytes and hidden features
/// stay in memory.
class ListingDraft {
  ListingDraft({required this.type}) : idempotencyKey = requestId();

  final String type; // LOST | FOUND
  String idempotencyKey;
  String? categoryId, locationId, color;
  String title = '', description = '', brand = '', size = '', rewardAmount = '', rewardNote = '';

  /// Private contact phone; remembered separately on this device, not in the draft.
  String contactPhone = '';

  /// True when the AI already filled what the details step asks for.
  bool get detailsReady => categoryId != null && title.trim().length >= 3;

  /// Digits only, for a quick "looks like a phone number" check.
  bool get phoneLooksValid => contactPhone.replaceAll(RegExp(r'\D'), '').length >= 9;
  DateTime date = DateTime.now();
  List<String> hiddenFeatures = [];
  UploadedMedia? media;
  bool suggestionsEnabled = true, aiAssisted = false, acceptRules = false, notifyMatches = true;
  /// Suggested category slug from the AI layer (shown as a hint, never auto-published).
  String? suggestedCategorySlug;

  /// Fields the person set themselves: AI never overwrites them.
  final Set<String> manual = {};

  /// Fields AI filled (marked with a sparkle until the person edits them).
  final Set<String> aiFields = {};

  /// The values AI wrote last, so a retake can replace them but nothing typed.
  final Map<String, String> aiValues = {};

  /// The category came from the typed description rather than a photo.
  bool textHintApplied = false;

  /// The camera opens by itself once when the found flow starts.
  bool autoCameraShown = false;

  bool get isLost => type == 'LOST';
  bool get hasContent => title.isNotEmpty || description.isNotEmpty || categoryId != null || media != null;

  Map<String, dynamic> toJson() => {
    'idempotencyKey': idempotencyKey,
    'categoryId': categoryId,
    'locationId': locationId,
    'color': color,
    'title': title,
    'description': description,
    'brand': brand,
    'size': size,
    'rewardAmount': rewardAmount,
    'rewardNote': rewardNote,
    'date': date.toIso8601String(),
    'notifyMatches': notifyMatches,
    'suggestionsEnabled': suggestionsEnabled,
  };

  static ListingDraft fromJson(String type, Map<String, dynamic> j) {
    final d = ListingDraft(type: type);
    d.idempotencyKey = (j['idempotencyKey'] as String?) ?? d.idempotencyKey;
    d.categoryId = j['categoryId'] as String?;
    d.locationId = j['locationId'] as String?;
    d.color = j['color'] as String?;
    d.title = (j['title'] as String?) ?? '';
    d.description = (j['description'] as String?) ?? '';
    d.brand = (j['brand'] as String?) ?? '';
    d.size = (j['size'] as String?) ?? '';
    d.rewardAmount = (j['rewardAmount'] as String?) ?? '';
    d.rewardNote = (j['rewardNote'] as String?) ?? '';
    d.date = DateTime.tryParse('${j['date']}') ?? DateTime.now();
    d.notifyMatches = j['notifyMatches'] != false;
    d.suggestionsEnabled = j['suggestionsEnabled'] != false;
    return d;
  }

  static ListingDraft fromItem(Item item) {
    final d = ListingDraft(type: item.listingType);
    d.categoryId = item.category.id;
    d.locationId = item.location?.id;
    d.color = item.color;
    d.title = item.title;
    d.description = item.description;
    d.brand = item.brand ?? '';
    d.size = item.size ?? '';
    d.rewardAmount = item.reward?.amount?.toString() ?? '';
    d.rewardNote = item.reward?.note ?? '';
    d.date = item.eventTimeStart ?? DateTime.now();
    d.hiddenFeatures = List.of(item.hiddenFeatures ?? const []);
    d.contactPhone = item.contactPhone ?? '';
    if (item.cover != null) {
      d.media = UploadedMedia(id: item.cover!.id, status: 'READY', publicUrl: item.cover!.publicUrl, thumbUrl: item.cover!.thumbUrl);
    }
    return d;
  }

  /// Request body shared by create and update.
  Map<String, dynamic> toBody({required Category? category}) => {
    'categoryId': categoryId,
    'title': title.trim(),
    'description': description.trim(),
    if (brand.trim().isNotEmpty) 'brand': brand.trim(),
    if (size.trim().isNotEmpty) 'size': size.trim(),
    if (color != null) 'color': color,
    if (locationId != null) 'approximateLocationId': locationId,
    'eventTimeStart': date.toUtc().toIso8601String(),
    'hiddenFeatures': hiddenFeatures.map((v) => v.trim()).where((v) => v.isNotEmpty).toList(),
    'contactPhone': contactPhone.trim(),
    if (media != null && media!.ready && !(category?.photoRestricted ?? false)) 'mediaIds': [media!.id],
    if (isLost && rewardAmount.trim().isNotEmpty)
      'reward': {'amount': int.tryParse(rewardAmount.trim()) ?? 0, if (rewardNote.trim().isNotEmpty) 'note': rewardNote.trim()},
    'publish': true,
  };

  /// Builds a local Item so the review step renders exactly what others will see.
  Item toPreview({required Category category, Location? location, Location? parent, required String ownerName}) => Item(
    id: 'preview',
    listingType: type,
    status: 'PUBLISHED',
    title: title.trim(),
    description: description.trim(),
    category: category,
    color: color,
    brand: brand.trim().isEmpty ? null : brand.trim(),
    size: size.trim().isEmpty ? null : size.trim(),
    location: location == null
        ? null
        : ItemLocation(id: location.id, nameRu: location.nameRu, nameKy: location.nameKy, nameEn: location.nameEn, parentNameRu: parent?.nameRu, parentNameKy: parent?.nameKy, parentNameEn: parent?.nameEn),
    eventTimeStart: date,
    reward: isLost && rewardAmount.trim().isNotEmpty
        ? Reward(amount: int.tryParse(rewardAmount.trim()), currency: 'KGS', note: rewardNote.trim().isEmpty ? null : rewardNote.trim())
        : null,
    media: media != null && media!.ready && !category.photoRestricted ? [MediaRef(id: media!.id, publicUrl: media!.publicUrl, thumbUrl: media!.thumbUrl)] : const [],
    owner: Owner(id: 'me', publicName: ownerName, trustLevel: 'ContactVerified'),
    createdAt: DateTime.now(),
    publishedAt: DateTime.now(),
    isOwner: true,
  );
}
