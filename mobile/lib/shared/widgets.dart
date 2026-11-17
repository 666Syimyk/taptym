import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/l10n_ext.dart';
import '../core/models.dart';
import '../core/network/api_error.dart';
import '../core/theme/glass.dart';
import '../core/theme/tokens.dart';

/// Screen states required by PRD §8.15: loading, empty, error, offline, retry.
class StateView extends StatelessWidget {
  const StateView({
    super.key,
    required this.icon,
    required this.title,
    this.body,
    this.actionLabel,
    this.onAction,
    this.secondaryLabel,
    this.onSecondary,
  });
  final IconData icon;
  final String title;
  final String? body, actionLabel, secondaryLabel;
  final VoidCallback? onAction, onSecondary;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(Space.xxxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: t.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(26),
              ),
              child: Icon(icon, size: 36, color: t.colorScheme.onPrimaryContainer),
            ),
            const SizedBox(height: Space.xl),
            Text(title, textAlign: TextAlign.center, style: t.textTheme.titleLarge),
            if (body != null) ...[
              const SizedBox(height: Space.s),
              Text(
                body!,
                textAlign: TextAlign.center,
                style: t.textTheme.bodyMedium?.copyWith(
                  color: t.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            if (actionLabel != null) ...[
              const SizedBox(height: Space.xxl),
              FilledButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
            if (secondaryLabel != null) ...[
              const SizedBox(height: Space.s),
              TextButton(onPressed: onSecondary, child: Text(secondaryLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry});
  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final e = error is ApiError ? error as ApiError : null;
    if (e != null && e.offline) {
      return StateView(
        icon: Icons.wifi_off_rounded,
        title: l.offlineBanner,
        actionLabel: l.retry,
        onAction: onRetry,
      );
    }
    if (e != null && e.isNotFound) {
      final removed = e.itemState == 'content_removed';
      return StateView(
        icon: removed ? Icons.block_rounded : Icons.inventory_2_outlined,
        title: removed ? l.contentRemoved : l.itemUnavailable,
        actionLabel: l.toHome,
        onAction: () => context.go('/home'),
      );
    }
    if (e != null && e.isForbidden) {
      return StateView(
        icon: Icons.lock_outline_rounded,
        title: l.accessDenied,
        body: e.message,
      );
    }
    return StateView(
      icon: Icons.error_outline_rounded,
      title: l.errorGeneric,
      body: e?.message.isNotEmpty == true ? e!.message : null,
      actionLabel: onRetry == null ? null : l.retry,
      onAction: onRetry,
    );
  }
}

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});
  @override
  Widget build(BuildContext context) => const Center(
    child: Padding(
      padding: EdgeInsets.all(Space.xxxl),
      child: CircularProgressIndicator.adaptive(),
    ),
  );
}

/// Skeleton placeholders for feeds — no infinite spinners (PRD §8.15).
class SkeletonList extends StatelessWidget {
  const SkeletonList({super.key, this.count = 4, this.height = 116});
  final int count;
  final double height;
  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme.surfaceContainerHighest;
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(Space.l, Space.m, Space.l, 120),
      itemCount: count,
      separatorBuilder: (_, _) => const SizedBox(height: Space.m),
      itemBuilder: (_, _) => Container(
        height: height,
        decoration: BoxDecoration(
          color: c,
          borderRadius: BorderRadius.circular(Radii.card),
        ),
      ),
    );
  }
}

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});
  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Container(
      margin: const EdgeInsets.fromLTRB(Space.l, Space.s, Space.l, 0),
      padding: const EdgeInsets.symmetric(horizontal: Space.m, vertical: Space.s),
      decoration: BoxDecoration(
        color: t.colorScheme.tertiary.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(Radii.chip),
      ),
      child: Row(
        children: [
          Icon(Icons.wifi_off_rounded, size: 18, color: t.colorScheme.tertiary),
          const SizedBox(width: Space.s),
          Expanded(child: Text(context.l10n.offlineBanner, style: t.textTheme.bodySmall)),
        ],
      ),
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.label, this.color, this.icon});
  final String label;
  final Color? color;
  final IconData? icon;
  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 14, color: c), const SizedBox(width: 4)],
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: c,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

Color statusColor(String status) => switch (status) {
  'PUBLISHED' => TabyldyColors.success,
  'PENDING_REVIEW' => TabyldyColors.warning,
  'RESOLVED' => TabyldyColors.accentMint,
  'REMOVED' => TabyldyColors.error,
  _ => TabyldyColors.secondaryText,
};

Color claimStatusColor(String status) => switch (status) {
  'PLAUSIBLE' || 'APPROVED_FOR_HANDOFF' => TabyldyColors.success,
  'COMPLETED' => TabyldyColors.accentMint,
  'REJECTED' => TabyldyColors.error,
  'NEEDS_MORE_INFORMATION' || 'UNDER_REVIEW' => TabyldyColors.warning,
  'WITHDRAWN' => TabyldyColors.secondaryText,
  _ => TabyldyColors.primary,
};

Color listingTypeColor(String type) =>
    type == 'LOST' ? TabyldyColors.warning : TabyldyColors.accentMint;

/// Small colour swatch used in characteristics and filters.
class ColorDot extends StatelessWidget {
  const ColorDot({super.key, required this.colorKey, this.size = 14});
  final String colorKey;
  final double size;
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: Labels.swatch(colorKey),
      shape: BoxShape.circle,
      border: Border.all(color: Theme.of(context).colorScheme.outline),
    ),
  );
}

/// Network image with placeholder, cached and downscaled for cards (PRD §25.1).
class NetImage extends StatelessWidget {
  const NetImage({super.key, required this.url, this.fit = BoxFit.cover, this.cacheWidth});
  final String url;
  final BoxFit fit;
  final int? cacheWidth;
  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    return CachedNetworkImage(
      imageUrl: url,
      fit: fit,
      memCacheWidth: cacheWidth,
      fadeInDuration: Motion.card,
      placeholder: (_, _) => ColoredBox(color: c.surfaceContainerHighest),
      errorWidget: (_, _, _) => ColoredBox(
        color: c.surfaceContainerHighest,
        child: Icon(Icons.image_not_supported_outlined, color: c.onSurfaceVariant),
      ),
    );
  }
}

class ItemThumb extends StatelessWidget {
  const ItemThumb({super.key, required this.item, this.size = 88, this.radius = 20});
  final Item item;
  final double size, radius;
  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    final url = item.cover?.thumbUrl;
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: SizedBox(
        width: size,
        height: size,
        child: url == null
            ? ColoredBox(
                color: c.primaryContainer,
                child: Icon(
                  Labels.categoryIcon(item.category.icon),
                  color: c.onPrimaryContainer,
                  size: size * 0.4,
                ),
              )
            : NetImage(url: url, cacheWidth: (size * 3).round()),
      ),
    );
  }
}

/// Feed card (PRD §8.4/§8.5): photo, title, category, colour, approximate area, time,
/// status, reward and the secondary action. Hidden features never appear here.
class ItemCard extends StatelessWidget {
  const ItemCard({super.key, required this.item, this.onTap, this.onSecondary, this.showStatus = false});
  final Item item;
  final VoidCallback? onTap, onSecondary;
  final bool showStatus;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final loc = context.localeCode;
    return Semantics(
      button: true,
      label: '${item.isLost ? l.lostLabel : l.foundLabel}. ${item.title}',
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(Space.m),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ItemThumb(item: item),
                    const SizedBox(width: Space.m),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              StatusChip(
                                label: item.isLost ? l.lostLabel : l.foundLabel,
                                color: listingTypeColor(item.listingType),
                              ),
                              if (showStatus) ...[
                                const SizedBox(width: 6),
                                StatusChip(
                                  label: Labels.itemStatus(l, item.status),
                                  color: statusColor(item.status),
                                ),
                              ],
                              const Spacer(),
                              Text(
                                Labels.relativeTime(l, item.publishedAt ?? item.createdAt),
                                style: t.textTheme.labelSmall,
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            item.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: t.textTheme.titleMedium,
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              if (item.color != null) ...[
                                ColorDot(colorKey: item.color!, size: 12),
                                const SizedBox(width: 6),
                              ],
                              Expanded(
                                child: Text(
                                  [
                                    item.category.name(loc),
                                    if (item.location != null) item.location!.label(loc),
                                  ].join(' · '),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: t.textTheme.bodySmall,
                                ),
                              ),
                            ],
                          ),
                          if (item.reward != null) ...[
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Icon(Icons.card_giftcard_rounded, size: 16, color: t.colorScheme.secondary),
                                const SizedBox(width: 4),
                                Text(
                                  item.reward!.amount != null
                                      ? l.rewardAmount('${item.reward!.amount}')
                                      : l.reward,
                                  style: t.textTheme.labelSmall?.copyWith(
                                    color: t.colorScheme.secondary,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                if (onSecondary != null) ...[
                  const SizedBox(height: Space.s),
                  Row(
                    children: [
                      TextButton(
                        style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 10), minimumSize: const Size(44, 38)),
                        onPressed: onTap,
                        child: Text(l.details),
                      ),
                      const Spacer(),
                      FilledButton.tonalIcon(
                        style: FilledButton.styleFrom(minimumSize: const Size(44, 40), padding: const EdgeInsets.symmetric(horizontal: 14)),
                        onPressed: onSecondary,
                        icon: Icon(item.isLost ? Icons.lightbulb_outline_rounded : Icons.back_hand_outlined, size: 18),
                        label: Text(item.isLost ? l.maybeIFoundIt : l.thisIsMine),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Compact vertical tile for horizontal carousels on the home screen.
class ItemTile extends StatelessWidget {
  const ItemTile({super.key, required this.item, this.onTap, this.width = 150});
  final Item item;
  final VoidCallback? onTap;
  final double width;
  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l = context.l10n;
    return SizedBox(
      width: width,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  ItemThumb(item: item, size: width, radius: 0),
                  Positioned(
                    left: 8,
                    top: 8,
                    child: StatusChip(
                      label: item.isLost ? l.lostLabel : l.foundLabel,
                      color: listingTypeColor(item.listingType),
                    ),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: t.textTheme.titleMedium?.copyWith(fontSize: 14)),
                    const SizedBox(height: 4),
                    Text(
                      item.location?.nameRu != null
                          ? item.location!.label(context.localeCode)
                          : item.category.name(context.localeCode),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: t.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.actionLabel, this.onAction, this.padding});
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  final EdgeInsetsGeometry? padding;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? const EdgeInsets.fromLTRB(Space.l, Space.xl, Space.l, Space.s),
      child: Row(
        children: [
          Expanded(child: Text(title, style: Theme.of(context).textTheme.headlineSmall)),
          if (actionLabel != null) TextButton(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ),
    );
  }
}

/// Primary action with built-in busy state.
class BusyButton extends StatelessWidget {
  const BusyButton({super.key, required this.label, required this.onPressed, this.busy = false, this.icon, this.outlined = false, this.tonal = false});
  final String label;
  final VoidCallback? onPressed;
  final bool busy, outlined, tonal;
  final IconData? icon;
  @override
  Widget build(BuildContext context) {
    final spinnerColor = outlined || tonal ? Theme.of(context).colorScheme.primary : Colors.white;
    final child = busy
        ? SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: spinnerColor))
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)],
              Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
            ],
          );
    if (outlined) return OutlinedButton(onPressed: busy ? null : onPressed, child: child);
    if (tonal) {
      return FilledButton.tonal(
        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
        onPressed: busy ? null : onPressed,
        child: child,
      );
    }
    return FilledButton(onPressed: busy ? null : onPressed, child: child);
  }
}

void showSnack(BuildContext context, String text, {bool error = false}) {
  final scheme = Theme.of(context).colorScheme;
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text), backgroundColor: error ? scheme.error : null));
}

String errorText(BuildContext context, Object e) {
  if (e is ApiError && e.message.isNotEmpty) return e.message;
  if (e is ApiError && e.offline) return context.l10n.offlineBanner;
  return context.l10n.errorGeneric;
}

class InfoNote extends StatelessWidget {
  const InfoNote({super.key, required this.text, this.icon = Icons.info_outline_rounded, this.color, this.title});
  final String text;
  final String? title;
  final IconData icon;
  final Color? color;
  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final c = color ?? t.colorScheme.primary;
    return Container(
      padding: const EdgeInsets.all(Space.m),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(Radii.button),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: c),
          const SizedBox(width: Space.s),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(title!, style: t.textTheme.titleMedium?.copyWith(fontSize: 14)),
                  ),
                Text(text, style: t.textTheme.bodySmall?.copyWith(color: t.colorScheme.onSurface)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Key/value row for characteristics (PRD §8.7).
class SpecRow extends StatelessWidget {
  const SpecRow({super.key, required this.icon, required this.label, required this.value, this.leading});
  final IconData icon;
  final String label, value;
  final Widget? leading;
  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: t.colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, size: 18, color: t.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(width: Space.m),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: t.textTheme.labelSmall),
                Row(
                  children: [
                    if (leading != null) ...[leading!, const SizedBox(width: 6)],
                    Flexible(child: Text(value, style: t.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600))),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Avatar with the user's initial — no photos of people are shown anywhere.
class InitialAvatar extends StatelessWidget {
  const InitialAvatar({super.key, required this.name, this.size = 44});
  final String name;
  final double size;
  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    final initial = name.trim().isEmpty ? '•' : name.trim().characters.first.toUpperCase();
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [c.primary, TabyldyColors.primaryDeep]),
        borderRadius: BorderRadius.circular(size * 0.36),
      ),
      child: Text(initial, style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: size * 0.42)),
    );
  }
}

/// Bottom action bar rendered on glass (PRD §6.3: floating buttons).
class GlassActionBar extends StatelessWidget {
  const GlassActionBar({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    minimum: const EdgeInsets.fromLTRB(Space.l, 0, Space.l, Space.m),
    child: GlassPanel(radius: 24, padding: const EdgeInsets.all(Space.m), child: child),
  );
}

/// Icon button with a numeric badge for the home header.
class BadgeIconButton extends StatelessWidget {
  const BadgeIconButton({super.key, required this.icon, required this.tooltip, required this.onPressed, this.count = 0});
  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;
  final int count;
  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    return Tooltip(
      message: tooltip,
      child: Material(
        color: c.surface,
        shape: const CircleBorder(),
        elevation: 0,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox(
            width: 44,
            height: 44,
            child: Badge(
              isLabelVisible: count > 0,
              label: Text(count > 99 ? '99+' : '$count'),
              offset: const Offset(-4, 4),
              child: Icon(icon, color: c.onSurface),
            ),
          ),
        ),
      ),
    );
  }
}

/// Shows a modal sheet with the app's rounded glass look.
Future<T?> showAppSheet<T>(BuildContext context, {required WidgetBuilder builder}) =>
    showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: builder,
    );
