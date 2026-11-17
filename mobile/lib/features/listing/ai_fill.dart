import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/network/api_client.dart';
import '../../core/repositories.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';
import 'listing_draft.dart';

/// Category, colour and brand understood from what the person typed.
class TextHints {
  const TextHints({this.categorySlug, this.color, this.brand});
  final String? categorySlug, color, brand;
  factory TextHints.fromJson(Map<String, dynamic> j) => TextHints(
    categorySlug: j['categorySlug'] as String?,
    color: j['color'] as String?,
    brand: j['brand'] as String?,
  );
}

class AiRepository {
  AiRepository(this._api);
  final ApiClient _api;
  Future<TextHints> textHints(String title, String description) async => TextHints.fromJson(
    await _api.post<Map<String, dynamic>>(
      '/v1/ai/text-hints',
      data: {'title': title, if (description.trim().isNotEmpty) 'description': description},
    ),
  );
}

final aiRepositoryProvider = Provider((ref) => AiRepository(ref.watch(apiClientProvider)));

String? _str(Object? v) => v is String && v.trim().isNotEmpty ? v.trim() : null;

/// Fills one draft field unless the person chose it themselves. A value the AI wrote
/// earlier may be replaced by a newer AI value (a retake), never a typed one.
bool _fill(ListingDraft d, String key, String? current, String? value, void Function(String) set) {
  if (value == null || value.isEmpty || d.manual.contains(key)) return false;
  final untouched = current == null || current.isEmpty || current == d.aiValues[key];
  if (!untouched) return false;
  set(value);
  d.aiValues[key] = value;
  d.aiFields.add(key);
  return true;
}

/// Applies what the server recognised on the photo. Returns true if anything changed.
bool applyPhotoSuggestions(ListingDraft d, Map<String, dynamic> s, List<Category> cats, String locale) {
  // AI writes titles in Russian and Kyrgyz only: in English people write their own.
  final lang = switch (locale) {
    'ky' => 'Ky',
    'ru' => 'Ru',
    _ => null,
  };
  var changed = false;
  final slug = _str(s['categorySlug']);
  final confident = ((s['confidence'] as num?) ?? 0) >= 0.5;
  final cat = slug == null ? null : cats.where((c) => c.slug == slug).firstOrNull;
  if (cat != null) {
    d.suggestedCategorySlug = slug;
    if (confident) changed |= _fill(d, 'category', d.categoryId, cat.id, (v) => d.categoryId = v);
  }
  final color = _str(s['color']);
  if (color != null && Labels.colorKeys.contains(color)) {
    changed |= _fill(d, 'color', d.color, color, (v) => d.color = v);
  }
  // Brand and model share one field: "Apple iPhone 13".
  final brand = [_str(s['brand']), _str(s['model'])].whereType<String>().join(' ');
  changed |= _fill(d, 'brand', d.brand, brand.isEmpty ? null : brand, (v) => d.brand = v);
  if (lang != null) {
    changed |= _fill(d, 'title', d.title, _str(s['title$lang']), (v) => d.title = v);
    changed |= _fill(d, 'description', d.description, _str(s['description$lang']), (v) => d.description = v);
  }
  if (changed) d.aiAssisted = true;
  return changed;
}

/// Applies hints from the typed title/description. Returns true if anything changed.
bool applyTextHints(ListingDraft d, TextHints h, List<Category> cats) {
  var changed = false;
  final cat = h.categorySlug == null ? null : cats.where((c) => c.slug == h.categorySlug).firstOrNull;
  if (cat != null) changed |= _fill(d, 'category', d.categoryId, cat.id, (v) => d.categoryId = v);
  if (h.color != null && Labels.colorKeys.contains(h.color)) {
    changed |= _fill(d, 'color', d.color, h.color, (v) => d.color = v);
  }
  if (h.brand != null) changed |= _fill(d, 'brand', d.brand, h.brand, (v) => d.brand = v);
  if (changed) d.aiAssisted = true;
  return changed;
}

Future<String?> pickCategory(BuildContext context, List<Category> cats, String? selected) =>
    showAppSheet<String>(
      context,
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(Space.xl, 0, Space.xl, Space.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(ctx.l10n.chooseCategory, style: Theme.of(ctx).textTheme.headlineSmall),
              const SizedBox(height: Space.l),
              Wrap(
                spacing: Space.s,
                runSpacing: Space.s,
                children: [
                  for (final c in cats)
                    ChoiceChip(
                      avatar: Icon(Labels.categoryIcon(c.icon), size: 18),
                      label: Text(c.name(ctx.localeCode)),
                      selected: c.id == selected,
                      onSelected: (_) => Navigator.pop(ctx, c.id),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

Future<String?> pickColorSheet(BuildContext context, String? selected) => showAppSheet<String>(
  context,
  builder: (ctx) {
    final l = ctx.l10n;
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(Space.xl, 0, Space.xl, Space.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l.chooseColor, style: Theme.of(ctx).textTheme.headlineSmall),
            const SizedBox(height: Space.l),
            Wrap(
              spacing: Space.s,
              runSpacing: Space.s,
              children: [
                for (final c in Labels.colorKeys)
                  ChoiceChip(
                    avatar: ColorDot(colorKey: c),
                    label: Text(Labels.color(l, c)),
                    selected: c == selected,
                    onSelected: (_) => Navigator.pop(ctx, c),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  },
);

/// What the AI recognised, as large tappable fields: category, colour, brand, title.
/// Every value can be corrected in one tap; corrections are never overwritten.
class AiResultCard extends ConsumerStatefulWidget {
  const AiResultCard({super.key, required this.draft, required this.onChanged, this.showTitle = true});
  final ListingDraft draft;
  final VoidCallback onChanged;
  final bool showTitle;
  @override
  ConsumerState<AiResultCard> createState() => _AiResultCardState();
}

class _AiResultCardState extends ConsumerState<AiResultCard> {
  late final title = TextEditingController(text: widget.draft.title);
  late final brand = TextEditingController(text: widget.draft.brand);

  @override
  void didUpdateWidget(covariant AiResultCard old) {
    super.didUpdateWidget(old);
    // AI may have refilled the draft after a retake.
    if (title.text != widget.draft.title) title.text = widget.draft.title;
    if (brand.text != widget.draft.brand) brand.text = widget.draft.brand;
  }

  @override
  void dispose() {
    title.dispose();
    brand.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final d = widget.draft;
    final cats = ref.watch(categoriesProvider).value ?? const <Category>[];
    final category = cats.where((c) => c.id == d.categoryId).firstOrNull;
    final suggested = cats.where((c) => c.slug == d.suggestedCategorySlug).firstOrNull;
    final restricted = category?.photoRestricted ?? false;

    Widget sparkle(String key) => d.aiFields.contains(key) && !d.manual.contains(key)
        ? const Padding(padding: EdgeInsets.only(left: 4), child: Icon(Icons.auto_awesome_rounded, size: 14, color: TabyldyColors.primary))
        : const SizedBox.shrink();

    return GlassPanel(
      padding: const EdgeInsets.all(Space.l),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  gradient: const LinearGradient(colors: [TabyldyColors.primary, TabyldyColors.accentMint]),
                ),
                child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 18),
              ),
              const SizedBox(width: Space.m),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l.aiResultTitle, style: t.textTheme.titleMedium),
                    Text(l.aiResultHint, style: t.textTheme.bodySmall),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: Space.l),
          _FieldTile(
            icon: category == null ? Icons.category_outlined : Labels.categoryIcon(category.icon),
            label: l.category,
            value: category?.name(context.localeCode) ?? (suggested != null ? l.aiMaybe(suggested.name(context.localeCode)) : l.chooseCategory),
            missing: category == null,
            trailing: sparkle('category'),
            onTap: () async {
              final id = await pickCategory(context, cats, d.categoryId ?? suggested?.id);
              if (id == null) return;
              d.categoryId = id;
              d.manual.add('category');
              widget.onChanged();
            },
          ),
          if (restricted) ...[
            const SizedBox(height: Space.s),
            InfoNote(text: l.noPhotoRestricted, icon: Icons.lock_outline_rounded),
          ],
          const SizedBox(height: Space.s),
          _FieldTile(
            icon: Icons.palette_outlined,
            leading: d.color == null ? null : ColorDot(colorKey: d.color!, size: 18),
            label: l.color,
            value: d.color == null ? l.chooseColor : Labels.color(l, d.color),
            missing: d.color == null,
            trailing: sparkle('color'),
            onTap: () async {
              final c = await pickColorSheet(context, d.color);
              if (c == null) return;
              d.color = c;
              d.manual.add('color');
              widget.onChanged();
            },
          ),
          const SizedBox(height: Space.m),
          TextField(
            controller: brand,
            maxLength: 60,
            decoration: InputDecoration(
              labelText: l.brandField,
              counterText: '',
              prefixIcon: const Icon(Icons.sell_outlined),
              suffixIcon: d.aiFields.contains('brand') && !d.manual.contains('brand') ? const Icon(Icons.auto_awesome_rounded, size: 18) : null,
            ),
            onChanged: (v) {
              d.brand = v;
              d.manual.add('brand');
              widget.onChanged();
            },
          ),
          if (widget.showTitle) ...[
            const SizedBox(height: Space.m),
            TextField(
              controller: title,
              maxLength: 80,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                labelText: l.titleField,
                hintText: d.isLost ? l.titleHintLost : l.titleHintFound,
                counterText: '',
                prefixIcon: const Icon(Icons.short_text_rounded),
                suffixIcon: d.aiFields.contains('title') && !d.manual.contains('title') ? const Icon(Icons.auto_awesome_rounded, size: 18) : null,
              ),
              onChanged: (v) {
                d.title = v;
                d.manual.add('title');
                widget.onChanged();
              },
            ),
          ],
        ],
      ),
    );
  }
}

class _FieldTile extends StatelessWidget {
  const _FieldTile({required this.icon, required this.label, required this.value, required this.onTap, this.missing = false, this.leading, this.trailing});
  final IconData icon;
  final String label, value;
  final VoidCallback onTap;
  final bool missing;
  final Widget? leading, trailing;
  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final c = t.colorScheme;
    return Semantics(
      button: true,
      label: '$label: $value',
      child: Material(
        color: c.surface,
        borderRadius: BorderRadius.circular(Radii.button),
        child: InkWell(
          borderRadius: BorderRadius.circular(Radii.button),
          onTap: onTap,
          child: Container(
            constraints: const BoxConstraints(minHeight: 56),
            padding: const EdgeInsets.symmetric(horizontal: Space.l, vertical: Space.s),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(Radii.button),
              border: Border.all(color: missing ? c.primary.withValues(alpha: 0.6) : c.outline),
            ),
            child: Row(
              children: [
                leading ?? Icon(icon, size: 20, color: c.onSurfaceVariant),
                const SizedBox(width: Space.m),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(label, style: t.textTheme.labelSmall),
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              value,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: t.textTheme.bodyLarge?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: missing ? c.primary : c.onSurface,
                              ),
                            ),
                          ),
                          ?trailing,
                        ],
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, color: c.onSurfaceVariant),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Small "picked from your description" line shown under the category chips.
class TextHintNote extends StatelessWidget {
  const TextHintNote({super.key, required this.draft});
  final ListingDraft draft;
  @override
  Widget build(BuildContext context) {
    final fromText = draft.textHintApplied && draft.aiFields.contains('category') && !draft.manual.contains('category');
    return AnimatedSize(
      duration: Motion.card,
      child: fromText
          ? Padding(
              padding: const EdgeInsets.only(top: Space.s),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome_rounded, size: 16, color: TabyldyColors.primary),
                  const SizedBox(width: 6),
                  Text(context.l10n.aiFromText, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: TabyldyColors.primary)),
                ],
              ),
            )
          : const SizedBox(width: double.infinity),
    );
  }
}
