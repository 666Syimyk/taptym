import 'dart:async';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../core/session.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../shared/motion.dart';
import '../../shared/widgets.dart';
import '../common.dart';
import 'ai_fill.dart';
import 'listing_draft.dart';

const _pad = EdgeInsets.fromLTRB(Space.xl, Space.l, Space.xl, Space.xl);

// ---------------------------------------------------------------- photo step

/// Camera → preview → analysis → suggestions (PRD §10 steps 1–5).
class PhotoStep extends ConsumerStatefulWidget {
  const PhotoStep({super.key, required this.draft, required this.onChanged, this.prominent = false});
  final ListingDraft draft;
  final VoidCallback onChanged;
  final bool prominent;
  @override
  ConsumerState<PhotoStep> createState() => _PhotoStepState();
}

class _PhotoStepState extends ConsumerState<PhotoStep> {
  bool uploading = false;
  String? error;
  bool poorPhoto = false;

  /// True once a photo has been analysed, so the result card can show.
  bool analysed = false;

  Category? get category => ref.read(categoriesProvider).value?.where((c) => c.id == widget.draft.categoryId).firstOrNull;

  @override
  void initState() {
    super.initState();
    final d = widget.draft;
    analysed = d.media != null;
    // "I found something" → the camera, straight away (phones only: a browser needs a tap).
    if (widget.prominent && d.media == null && !d.autoCameraShown && !kIsWeb) {
      d.autoCameraShown = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) pick(ImageSource.camera);
      });
    }
  }

  Future<void> pick(ImageSource source) async {
    final XFile? image;
    try {
      image = await ImagePicker().pickImage(source: source, maxWidth: 2400, maxHeight: 2400, imageQuality: 88);
    } catch (e) {
      if (mounted) setState(() => error = context.l10n.cameraPermissionBody);
      return;
    }
    if (image == null || !mounted) return;
    setState(() {
      uploading = true;
      error = null;
    });
    try {
      final d = widget.draft;
      final uploaded = await ref.read(mediaRepositoryProvider).upload(
        await image.readAsBytes(),
        filename: image.name,
        categorySlug: category?.slug,
        suggestions: d.suggestionsEnabled,
        listingType: d.type,
      );
      if (!mounted) return;
      d.media = uploaded;
      final s = uploaded.suggestions;
      poorPhoto = s != null && (s['quality'] == 'blurry' || s['quality'] == 'dark');
      if (d.suggestionsEnabled && s != null) {
        final cats = ref.read(categoriesProvider).value ?? const <Category>[];
        applyPhotoSuggestions(d, s, cats, context.localeCode);
      }
      analysed = true;
      widget.onChanged();
    } catch (e) {
      if (mounted) setState(() => error = errorText(context, e));
    } finally {
      if (mounted) setState(() => uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final d = widget.draft;
    final media = d.media;
    final restricted = category?.photoRestricted ?? false;
    return ListView(
      padding: _pad,
      children: [
        if (media == null) ...[
          GlassPanel(
            radius: 32,
            padding: const EdgeInsets.all(Space.xxl),
            child: Column(
              children: [
                Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(colors: [TabyldyColors.primary, TabyldyColors.primaryDeep]),
                    boxShadow: [BoxShadow(color: TabyldyColors.primary.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))],
                  ),
                  child: const Icon(Icons.photo_camera_rounded, color: Colors.white, size: 44),
                ),
                const SizedBox(height: Space.xl),
                Text(l.photoStepBody, textAlign: TextAlign.center, style: t.textTheme.bodyMedium?.copyWith(color: t.colorScheme.onSurfaceVariant)),
                const SizedBox(height: Space.xl),
                BusyButton(label: l.takePhoto, icon: Icons.camera_alt_rounded, busy: uploading, onPressed: () => pick(ImageSource.camera)),
                const SizedBox(height: Space.s),
                BusyButton(label: l.pickFromGallery, icon: Icons.photo_library_outlined, tonal: true, onPressed: uploading ? null : () => pick(ImageSource.gallery)),
              ],
            ),
          ),
          const SizedBox(height: Space.l),
          InfoNote(text: l.cameraPermissionBody, icon: Icons.privacy_tip_outlined),
        ] else ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(Radii.card),
            child: AspectRatio(
              aspectRatio: 4 / 3,
              child: media.publicUrl != null && !restricted
                  ? NetImage(url: media.publicUrl!, fit: BoxFit.cover)
                  : ColoredBox(
                      color: t.colorScheme.surfaceContainerHighest,
                      child: Icon(media.blocked || restricted ? Icons.visibility_off_rounded : Icons.photo_outlined, size: 48, color: t.colorScheme.onSurfaceVariant),
                    ),
            ),
          ),
          const SizedBox(height: Space.m),
          Row(
            children: [
              Expanded(child: OutlinedButton.icon(onPressed: uploading ? null : () => pick(ImageSource.camera), icon: const Icon(Icons.refresh_rounded, size: 18), label: Text(l.retakePhoto))),
              const SizedBox(width: Space.s),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: uploading
                      ? null
                      : () {
                          d.media = null;
                          analysed = false;
                          widget.onChanged();
                        },
                  icon: const Icon(Icons.delete_outline_rounded, size: 18),
                  label: Text(l.removePhoto),
                ),
              ),
            ],
          ),
          if (media.blocked && !restricted) ...[const SizedBox(height: Space.m), InfoNote(text: l.photoBlocked, icon: Icons.gpp_bad_outlined, color: t.colorScheme.error)],
          if (restricted) ...[const SizedBox(height: Space.m), InfoNote(text: l.noPhotoRestricted, icon: Icons.lock_outline_rounded)],
          if (poorPhoto && !uploading) ...[
            const SizedBox(height: Space.m),
            InfoNote(text: l.aiPhotoHint, icon: Icons.wb_sunny_outlined, color: t.colorScheme.tertiary),
          ],
        ],
        if (uploading) ...[
          const SizedBox(height: Space.l),
          FadeSlideIn(
            child: d.suggestionsEnabled
                ? ShineSweep(
                    radius: Radii.card,
                    period: const Duration(milliseconds: 2200),
                    child: GlassPanel(
                      child: Row(
                        children: [
                          Bob(
                            child: Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(14),
                                gradient: const LinearGradient(colors: [TabyldyColors.primary, TabyldyColors.accentMint]),
                              ),
                              child: const Icon(Icons.auto_awesome_rounded, color: Colors.white),
                            ),
                          ),
                          const SizedBox(width: Space.m),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(l.aiAnalyzing, style: t.textTheme.titleMedium),
                                const SizedBox(height: 2),
                                Text(l.aiAnalyzingBody, style: t.textTheme.bodySmall),
                                const SizedBox(height: Space.s),
                                const LinearProgressIndicator(),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : Row(
                    children: [
                      const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                      const SizedBox(width: Space.m),
                      Text(l.photoProcessing, style: t.textTheme.bodyMedium),
                    ],
                  ),
          ),
        ] else if (media != null && analysed) ...[
          const SizedBox(height: Space.l),
          FadeSlideIn(child: AiResultCard(draft: d, onChanged: widget.onChanged)),
          if (media.unchecked && !restricted) ...[
            const SizedBox(height: Space.m),
            InfoNote(text: l.photoUnchecked, icon: Icons.schedule_rounded),
          ],
        ],
        if (error != null) ...[const SizedBox(height: Space.m), InfoNote(text: error!, color: t.colorScheme.error)],
        const SizedBox(height: Space.l),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          secondary: const Icon(Icons.auto_awesome_outlined),
          title: Text(l.aiSuggestionsTitle),
          subtitle: Text(d.suggestionsEnabled ? l.aiNotSure : l.aiSuggestionsOff),
          value: d.suggestionsEnabled,
          onChanged: uploading
              ? null
              : (v) {
                  d.suggestionsEnabled = v;
                  widget.onChanged();
                },
        ),
      ],
    );
  }
}

// -------------------------------------------------------------- details step

class DetailsStep extends ConsumerStatefulWidget {
  const DetailsStep({super.key, required this.draft, required this.onChanged, required this.formKey});
  final ListingDraft draft;
  final VoidCallback onChanged;
  final GlobalKey<FormState> formKey;
  @override
  ConsumerState<DetailsStep> createState() => _DetailsStepState();
}

class _DetailsStepState extends ConsumerState<DetailsStep> {
  late final title = TextEditingController(text: widget.draft.title);
  late final description = TextEditingController(text: widget.draft.description);
  late final brand = TextEditingController(text: widget.draft.brand);
  Timer? hintTimer;
  int hintRequest = 0;

  @override
  void dispose() {
    hintTimer?.cancel();
    title.dispose();
    description.dispose();
    brand.dispose();
    super.dispose();
  }

  /// AI may have changed the draft (photo or text hints): show it in the fields.
  void syncFields() {
    final d = widget.draft;
    if (title.text != d.title) title.text = d.title;
    if (description.text != d.description) description.text = d.description;
    if (brand.text != d.brand) brand.text = d.brand;
  }

  /// Reads category, colour and brand from what the person is typing.
  void scheduleHints() {
    hintTimer?.cancel();
    final d = widget.draft;
    if (!d.suggestionsEnabled || d.title.trim().length < 3) return;
    hintTimer = Timer(const Duration(milliseconds: 600), () async {
      final request = ++hintRequest;
      try {
        final hints = await ref.read(aiRepositoryProvider).textHints(d.title, d.description);
        if (!mounted || request != hintRequest) return;
        final cats = ref.read(categoriesProvider).value ?? const <Category>[];
        if (applyTextHints(d, hints, cats)) {
          d.textHintApplied = true;
          syncFields();
          widget.onChanged();
        }
      } catch (_) {
        // Hints are a convenience: offline or rate-limited simply means no hint.
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final d = widget.draft;
    final cats = ref.watch(categoriesProvider);
    final category = cats.value?.where((c) => c.id == d.categoryId).firstOrNull;
    final suggested = cats.value?.where((c) => c.slug == d.suggestedCategorySlug).firstOrNull;
    return Form(
      key: widget.formKey,
      child: ListView(
        padding: _pad,
        children: [
          TextFormField(
            controller: title,
            maxLength: 80,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(labelText: l.titleField, hintText: d.isLost ? l.titleHintLost : l.titleHintFound),
            validator: (v) => (v?.trim().length ?? 0) < 3 ? l.titleRequired : null,
            onChanged: (v) {
              d.title = v;
              d.manual.add('title');
              widget.onChanged();
              scheduleHints();
            },
          ),
          const SizedBox(height: Space.s),
          Text(l.category, style: t.textTheme.titleMedium),
          const SizedBox(height: Space.s),
          if (suggested != null && suggested.id != d.categoryId)
            Padding(
              padding: const EdgeInsets.only(bottom: Space.s),
              child: InfoNote(text: l.aiMaybe(suggested.name(context.localeCode)), icon: Icons.auto_awesome_rounded),
            ),
          AsyncBody(
            value: cats,
            retry: () => ref.invalidate(categoriesProvider),
            builder: (list) => Wrap(
              spacing: Space.s,
              runSpacing: Space.s,
              children: [
                for (final c in list)
                  ChoiceChip(
                    avatar: Icon(Labels.categoryIcon(c.icon), size: 16),
                    label: Text(c.name(context.localeCode)),
                    selected: d.categoryId == c.id,
                    onSelected: (_) {
                      d.categoryId = c.id;
                      d.manual.add('category');
                      widget.onChanged();
                    },
                  ),
              ],
            ),
          ),
          TextHintNote(draft: d),
          if (category != null && Labels.sensitiveHint(l, category) != null) ...[
            const SizedBox(height: Space.m),
            InfoNote(title: l.sensitiveCategoryTitle, text: Labels.sensitiveHint(l, category)!, icon: Icons.lock_outline_rounded, color: t.colorScheme.tertiary),
          ],
          const SizedBox(height: Space.xl),
          TextFormField(
            controller: description,
            maxLength: 1500,
            minLines: 3,
            maxLines: 6,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(labelText: l.descriptionField, alignLabelWithHint: true),
            onChanged: (v) {
              d.description = v;
              d.manual.add('description');
              widget.onChanged();
              scheduleHints();
            },
          ),
          if (d.isLost) ...[
            const SizedBox(height: Space.s),
            Text(l.stepPhoto, style: t.textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(l.noPhotoHint, style: t.textTheme.bodySmall),
            const SizedBox(height: Space.s),
            _InlinePhoto(
              draft: d,
              onChanged: () {
                syncFields();
                widget.onChanged();
              },
            ),
          ] else ...[
            const SizedBox(height: Space.s),
            Text(l.colorField, style: t.textTheme.titleMedium),
            const SizedBox(height: Space.s),
            ColorPicker(value: d.color, onChanged: (v) {
              d.color = v;
              d.manual.add('color');
              widget.onChanged();
            }),
            const SizedBox(height: Space.l),
            TextFormField(
              controller: brand,
              maxLength: 60,
              decoration: InputDecoration(labelText: l.brandField),
              onChanged: (v) {
                d.brand = v;
                d.manual.add('brand');
                widget.onChanged();
              },
            ),
          ],
        ],
      ),
    );
  }
}

/// Optional photo in the lost flow: an old photo of the item also fills the form.
class _InlinePhoto extends ConsumerStatefulWidget {
  const _InlinePhoto({required this.draft, required this.onChanged});
  final ListingDraft draft;
  final VoidCallback onChanged;
  @override
  ConsumerState<_InlinePhoto> createState() => _InlinePhotoState();
}

class _InlinePhotoState extends ConsumerState<_InlinePhoto> {
  bool uploading = false;
  Future<void> pick(ImageSource source) async {
    final image = await ImagePicker().pickImage(source: source, maxWidth: 2400, maxHeight: 2400, imageQuality: 88).catchError((_) => null);
    if (image == null || !mounted) return;
    setState(() => uploading = true);
    await runAction(context, () async {
      final d = widget.draft;
      final cats = ref.read(categoriesProvider).value ?? const <Category>[];
      final cat = cats.where((c) => c.id == d.categoryId).firstOrNull;
      final media = await ref.read(mediaRepositoryProvider).upload(
        await image.readAsBytes(),
        filename: image.name,
        categorySlug: cat?.slug,
        suggestions: d.suggestionsEnabled,
        listingType: d.type,
      );
      d.media = media;
      if (d.suggestionsEnabled && media.suggestions != null && mounted) {
        applyPhotoSuggestions(d, media.suggestions!, cats, context.localeCode);
      }
      widget.onChanged();
    });
    if (mounted) setState(() => uploading = false);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final media = widget.draft.media;
    return Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            width: 72,
            height: 72,
            child: uploading
                ? const Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)))
                : media?.publicUrl != null
                ? NetImage(url: media!.publicUrl!)
                : ColoredBox(color: Theme.of(context).colorScheme.surfaceContainerHighest, child: const Icon(Icons.photo_outlined)),
          ),
        ),
        const SizedBox(width: Space.m),
        Expanded(
          child: Wrap(
            spacing: Space.s,
            runSpacing: Space.xs,
            children: [
              ActionChip(avatar: const Icon(Icons.camera_alt_outlined, size: 16), label: Text(l.takePhoto), onPressed: uploading ? null : () => pick(ImageSource.camera)),
              ActionChip(avatar: const Icon(Icons.photo_library_outlined, size: 16), label: Text(l.pickFromGallery), onPressed: uploading ? null : () => pick(ImageSource.gallery)),
              if (media != null)
                ActionChip(
                  avatar: const Icon(Icons.close_rounded, size: 16),
                  label: Text(l.removePhoto),
                  onPressed: () {
                    widget.draft.media = null;
                    widget.onChanged();
                  },
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class ColorPicker extends StatelessWidget {
  const ColorPicker({super.key, required this.value, required this.onChanged});
  final String? value;
  final ValueChanged<String?> onChanged;
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Wrap(
      spacing: Space.s,
      runSpacing: Space.s,
      children: [
        for (final c in Labels.colorKeys)
          ChoiceChip(
            avatar: ColorDot(colorKey: c),
            label: Text(Labels.color(l, c)),
            selected: value == c,
            onSelected: (v) => onChanged(v ? c : null),
          ),
      ],
    );
  }
}

// ----------------------------------------------------------- place/attributes

/// Area + date (+ hidden features for the found flow, + colour/brand/size for lost).
class PlaceStep extends ConsumerStatefulWidget {
  const PlaceStep({super.key, required this.draft, required this.onChanged, this.withHidden = false, this.withAttributes = false});
  final ListingDraft draft;
  final VoidCallback onChanged;
  final bool withHidden, withAttributes;
  @override
  ConsumerState<PlaceStep> createState() => _PlaceStepState();
}

class _PlaceStepState extends ConsumerState<PlaceStep> {
  late final phone = TextEditingController(text: widget.draft.contactPhone);
  late final brand = TextEditingController(text: widget.draft.brand);
  late final size = TextEditingController(text: widget.draft.size);
  String? cityId;
  bool locating = false;
  String? locateNote;

  @override
  void initState() {
    super.initState();
    // Whoever found the item is usually still where it was found — suggest the district right away.
    if (!widget.draft.isLost && widget.draft.locationId == null) _locate(auto: true);
  }

  /// Device position → nearest district. Coordinates go to the server once and are not stored.
  Future<void> _locate({bool auto = false}) async {
    final l = context.l10n;
    setState(() => locating = true);
    String? note;
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        // Silent when the automatic attempt was refused: the city chips below still work.
        note = auto ? null : l.locateDenied;
      } else {
        final pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(accuracy: LocationAccuracy.low, timeLimit: Duration(seconds: 15)),
        );
        final id = await ref.read(catalogRepositoryProvider).resolveLocation(pos.latitude, pos.longitude);
        final loc = (ref.read(locationsProvider).value ?? const <Location>[]).where((x) => x.id == id).firstOrNull;
        if (loc == null) {
          note = l.locateNotFound;
        } else if (mounted) {
          widget.draft.locationId = loc.id;
          cityId = loc.kind == 'city' ? loc.id : loc.parentId;
          note = l.locateDone(loc.name(context.localeCode));
          widget.onChanged();
        }
      }
    } catch (_) {
      note = l.locateFailed;
    }
    if (!mounted) return;
    setState(() {
      locating = false;
      locateNote = note;
    });
  }

  @override
  void dispose() {
    phone.dispose();
    brand.dispose();
    size.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final d = widget.draft;
    final summary = [d.brand.trim(), d.title.trim()].firstWhere((v) => v.isNotEmpty, orElse: () => '');
    final locs = ref.watch(locationsProvider).value ?? const <Location>[];
    final cities = locs.where((x) => x.kind == 'city').toList();
    final selected = locs.where((x) => x.id == d.locationId).firstOrNull;
    cityId ??= selected == null ? null : (selected.kind == 'city' ? selected.id : selected.parentId);
    final districts = locs.where((x) => x.kind == 'district' && x.parentId == cityId).toList();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final isToday = DateUtils.isSameDay(d.date, today);
    final isYesterday = DateUtils.isSameDay(d.date, today.subtract(const Duration(days: 1)));

    return ListView(
      padding: _pad,
      children: [
        if (d.aiAssisted && summary.isNotEmpty) ...[
          FadeSlideIn(child: InfoNote(text: l.aiRecognized(d.title.trim().isEmpty ? summary : d.title.trim()), icon: Icons.auto_awesome_rounded)),
          const SizedBox(height: Space.l),
        ],
        Text(l.phoneForListing, style: t.textTheme.titleMedium),
        const SizedBox(height: Space.s),
        TextField(
          controller: phone,
          keyboardType: TextInputType.phone,
          autofillHints: const [AutofillHints.telephoneNumber],
          decoration: InputDecoration(hintText: l.phoneHint, prefixIcon: const Icon(Icons.phone_rounded)),
          onChanged: (v) {
            d.contactPhone = v;
            widget.onChanged();
          },
        ),
        const SizedBox(height: 6),
        Text(l.phoneListingNote, style: t.textTheme.bodySmall),
        const SizedBox(height: Space.xl),
        if (widget.withAttributes) ...[
          Text(l.colorField, style: t.textTheme.titleMedium),
          const SizedBox(height: Space.s),
          ColorPicker(value: d.color, onChanged: (v) {
            d.color = v;
            d.manual.add('color');
            widget.onChanged();
          }),
          const SizedBox(height: Space.l),
          TextField(
            controller: brand,
            maxLength: 60,
            decoration: InputDecoration(labelText: l.brandField),
            onChanged: (v) {
              d.brand = v;
              widget.onChanged();
            },
          ),
          TextField(
            controller: size,
            maxLength: 30,
            decoration: InputDecoration(labelText: l.sizeField),
            onChanged: (v) {
              d.size = v;
              widget.onChanged();
            },
          ),
          const SizedBox(height: Space.s),
        ],
        Text(l.areaField, style: t.textTheme.titleMedium),
        const SizedBox(height: 4),
        Text('${l.privacyBody.split('.').first}.', style: t.textTheme.bodySmall),
        const SizedBox(height: Space.s),
        Row(
          children: [
            OutlinedButton.icon(
              onPressed: locating ? null : () => _locate(),
              icon: locating
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.my_location_rounded, size: 18),
              label: Text(l.locateButton),
            ),
          ],
        ),
        if (locateNote != null) ...[const SizedBox(height: 6), Text(locateNote!, style: t.textTheme.bodySmall)],
        const SizedBox(height: Space.s),
        Wrap(
          spacing: Space.s,
          runSpacing: Space.s,
          children: [
            for (final c in cities)
              ChoiceChip(
                label: Text(c.name(context.localeCode)),
                selected: cityId == c.id,
                onSelected: (_) => setState(() {
                  cityId = c.id;
                  d.locationId = c.id;
                  widget.onChanged();
                }),
              ),
          ],
        ),
        if (districts.isNotEmpty) ...[
          const SizedBox(height: Space.m),
          Text(l.district, style: t.textTheme.labelSmall),
          const SizedBox(height: Space.s),
          Wrap(
            spacing: Space.s,
            runSpacing: Space.s,
            children: [
              for (final x in districts)
                ChoiceChip(
                  label: Text(x.name(context.localeCode)),
                  selected: d.locationId == x.id,
                  onSelected: (_) => setState(() {
                    d.locationId = x.id;
                    widget.onChanged();
                  }),
                ),
            ],
          ),
        ],
        const SizedBox(height: Space.xl),
        Text(l.dateField, style: t.textTheme.titleMedium),
        const SizedBox(height: Space.s),
        Wrap(
          spacing: Space.s,
          runSpacing: Space.s,
          children: [
            ChoiceChip(label: Text(l.today), selected: isToday, onSelected: (_) => setState(() => d.date = today)),
            ChoiceChip(label: Text(l.yesterday), selected: isYesterday, onSelected: (_) => setState(() => d.date = today.subtract(const Duration(days: 1)))),
            ActionChip(
              avatar: const Icon(Icons.calendar_today_outlined, size: 16),
              label: Text(formatDate(context, d.date)),
              onPressed: () async {
                final v = await showDatePicker(context: context, initialDate: d.date, firstDate: DateTime(2020), lastDate: DateTime.now());
                if (v != null) setState(() => d.date = v);
              },
            ),
          ],
        ),
        if (d.isLost) ...[const SizedBox(height: 4), Text(l.dateRangeApprox, style: t.textTheme.bodySmall)],
        if (widget.withHidden) ...[
          const SizedBox(height: Space.xl),
          HiddenFeaturesEditor(draft: d, onChanged: widget.onChanged),
        ],
      ],
    );
  }
}

// --------------------------------------------------------------- hidden step

class HiddenStep extends StatefulWidget {
  const HiddenStep({super.key, required this.draft, required this.onChanged});
  final ListingDraft draft;
  final VoidCallback onChanged;
  @override
  State<HiddenStep> createState() => _HiddenStepState();
}

class _HiddenStepState extends State<HiddenStep> {
  late final reward = TextEditingController(text: widget.draft.rewardAmount);
  late final note = TextEditingController(text: widget.draft.rewardNote);
  @override
  void dispose() {
    reward.dispose();
    note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final d = widget.draft;
    return ListView(
      padding: _pad,
      children: [
        HiddenFeaturesEditor(draft: d, onChanged: widget.onChanged),
        const SizedBox(height: Space.xxl),
        Text(l.reward, style: t.textTheme.titleMedium),
        const SizedBox(height: Space.s),
        TextField(
          controller: reward,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(8)],
          decoration: InputDecoration(labelText: l.rewardField, suffixText: 'сом'),
          onChanged: (v) {
            d.rewardAmount = v;
            widget.onChanged();
          },
        ),
        const SizedBox(height: Space.s),
        TextField(
          controller: note,
          maxLength: 120,
          decoration: InputDecoration(labelText: l.rewardNote),
          onChanged: (v) {
            d.rewardNote = v;
            widget.onChanged();
          },
        ),
        InfoNote(text: l.rewardDisclaimer, icon: Icons.payments_outlined),
        const SizedBox(height: Space.l),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          secondary: const Icon(Icons.notifications_active_outlined),
          title: Text(l.notifyMatches),
          value: d.notifyMatches,
          onChanged: (v) {
            d.notifyMatches = v;
            widget.onChanged();
          },
        ),
      ],
    );
  }
}

class HiddenFeaturesEditor extends StatefulWidget {
  const HiddenFeaturesEditor({super.key, required this.draft, required this.onChanged});
  final ListingDraft draft;
  final VoidCallback onChanged;
  @override
  State<HiddenFeaturesEditor> createState() => _HiddenFeaturesEditorState();
}

class _HiddenFeaturesEditorState extends State<HiddenFeaturesEditor> {
  final input = TextEditingController();
  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }

  void add() {
    final v = input.text.trim();
    if (v.isEmpty || widget.draft.hiddenFeatures.length >= 10) return;
    setState(() {
      widget.draft.hiddenFeatures.add(v.length > 200 ? v.substring(0, 200) : v);
      input.clear();
    });
    widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.lock_rounded, size: 20, color: t.colorScheme.primary),
            const SizedBox(width: 8),
            Text(l.hiddenFeaturesTitle, style: t.textTheme.titleMedium),
          ],
        ),
        const SizedBox(height: 4),
        Text(l.hiddenFeaturesHelp, style: t.textTheme.bodySmall),
        const SizedBox(height: Space.m),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: input,
                maxLength: 200,
                decoration: InputDecoration(hintText: l.hiddenFeatureHint, counterText: ''),
                onSubmitted: (_) => add(),
              ),
            ),
            const SizedBox(width: Space.s),
            IconButton.filled(tooltip: l.addFeature, onPressed: add, icon: const Icon(Icons.add_rounded)),
          ],
        ),
        const SizedBox(height: Space.s),
        Wrap(
          spacing: Space.s,
          runSpacing: Space.s,
          children: [
            for (final f in widget.draft.hiddenFeatures)
              InputChip(
                avatar: const Icon(Icons.visibility_off_outlined, size: 16),
                label: Text(f),
                onDeleted: () {
                  setState(() => widget.draft.hiddenFeatures.remove(f));
                  widget.onChanged();
                },
              ),
          ],
        ),
      ],
    );
  }
}

// --------------------------------------------------------------- review step

/// Shows exactly the card others will see (PRD §10 step 8), then rules + publish.
class ReviewStep extends ConsumerWidget {
  const ReviewStep({super.key, required this.draft, required this.onChanged, this.error, this.editing = false, this.onEditDetails});
  final ListingDraft draft;
  final VoidCallback onChanged;
  final String? error;
  final bool editing;

  /// Jumps back to the description step (it may have been skipped after the AI filled it).
  final VoidCallback? onEditDetails;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final t = Theme.of(context);
    final cats = ref.watch(categoriesProvider).value ?? const <Category>[];
    final locs = ref.watch(locationsProvider).value ?? const <Location>[];
    final category = cats.where((c) => c.id == draft.categoryId).firstOrNull;
    final location = locs.where((x) => x.id == draft.locationId).firstOrNull;
    final parent = location?.parentId == null ? null : locs.where((x) => x.id == location!.parentId).firstOrNull;
    final me = ref.watch(sessionProvider).value;
    final preview = category == null ? null : draft.toPreview(category: category, location: location, parent: parent, ownerName: me?.publicName ?? '');
    return ListView(
      padding: _pad,
      children: [
        Text(l.preview, style: t.textTheme.bodySmall),
        const SizedBox(height: Space.s),
        if (preview != null) ItemCard(item: preview),
        if (onEditDetails != null)
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(onPressed: onEditDetails, icon: const Icon(Icons.edit_outlined, size: 18), label: Text(l.editDetails)),
          ),
        const SizedBox(height: Space.s),
        if (category != null) SpecRow(icon: Labels.categoryIcon(category.icon), label: l.category, value: category.name(context.localeCode)),
        if (draft.color != null) SpecRow(icon: Icons.palette_outlined, label: l.color, value: Labels.color(l, draft.color), leading: ColorDot(colorKey: draft.color!)),
        if (draft.brand.trim().isNotEmpty) SpecRow(icon: Icons.sell_outlined, label: l.brand, value: draft.brand.trim()),
        if (draft.size.trim().isNotEmpty) SpecRow(icon: Icons.straighten_rounded, label: l.size, value: draft.size.trim()),
        if (location != null) SpecRow(icon: Icons.place_outlined, label: l.approximateArea, value: [parent?.name(context.localeCode), location.name(context.localeCode)].whereType<String>().join(', ')),
        SpecRow(icon: Icons.calendar_today_outlined, label: l.date, value: formatDate(context, draft.date)),
        if (draft.contactPhone.trim().isNotEmpty) SpecRow(icon: Icons.phone_outlined, label: l.phoneForListing, value: draft.contactPhone.trim()),
        SpecRow(icon: Icons.lock_outline_rounded, label: l.hiddenFeaturesTitle, value: '${draft.hiddenFeatures.length}'),
        const SizedBox(height: Space.m),
        if (draft.media?.unchecked == true && !(category?.photoRestricted ?? false)) InfoNote(text: l.photoUnchecked, icon: Icons.pending_actions_rounded, color: t.colorScheme.tertiary),
        if (category?.photoRestricted ?? false) InfoNote(text: l.noPhotoRestricted, icon: Icons.lock_outline_rounded),
        const SizedBox(height: Space.m),
        if (!editing) Text(l.publishConsent, style: t.textTheme.bodySmall),
        if (error != null) ...[const SizedBox(height: Space.s), InfoNote(text: error!, color: t.colorScheme.error, icon: Icons.error_outline_rounded)],
      ],
    );
  }
}
