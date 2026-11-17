import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/l10n_ext.dart';
import '../core/models.dart';
import '../core/repositories.dart';
import '../core/storage/prefs.dart';
import '../shared/widgets.dart';

String requestId() {
  final r = Random.secure();
  final b = List<int>.generate(16, (_) => r.nextInt(256));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  final h = b.map((n) => n.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
}

class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({super.key, required this.value, required this.builder, this.retry, this.loading});
  final AsyncValue<T> value;
  final Widget Function(T) builder;
  final VoidCallback? retry;
  final Widget? loading;
  @override
  Widget build(BuildContext context) => value.when(
    data: builder,
    loading: () => loading ?? const LoadingView(),
    error: (e, _) => ErrorView(error: e, onRetry: retry),
  );
}

Future<bool> confirmAction(BuildContext context, String title, String body, {String? confirmLabel, bool destructive = false}) async =>
    await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: Text(c.l10n.cancel)),
          FilledButton(
            style: destructive ? FilledButton.styleFrom(backgroundColor: Theme.of(c).colorScheme.error) : null,
            onPressed: () => Navigator.pop(c, true),
            child: Text(confirmLabel ?? c.l10n.verify),
          ),
        ],
      ),
    ) ??
    false;

Future<void> runAction(BuildContext context, Future<void> Function() action) async {
  try {
    await action();
  } catch (e) {
    if (context.mounted) showSnack(context, errorText(context, e), error: true);
  }
}

/// City picker used by the home "nearby" block and filters.
Future<void> pickCity(BuildContext context, WidgetRef ref) async {
  final locs = ref.read(locationsProvider).value ?? const <Location>[];
  final cities = locs.where((l) => l.kind == 'city').toList();
  final l = context.l10n;
  final chosen = await showAppSheet<String?>(
    context,
    builder: (ctx) => ListView(
      shrinkWrap: true,
      padding: const EdgeInsets.fromLTRB(8, 0, 8, 24),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
          child: Text(l.chooseCity, style: Theme.of(ctx).textTheme.headlineSmall),
        ),
        ListTile(
          leading: const Icon(Icons.public_rounded),
          title: Text(l.allCities),
          onTap: () => Navigator.pop(ctx, ''),
        ),
        ...cities.map(
          (c) => ListTile(
            leading: const Icon(Icons.location_city_rounded),
            title: Text(c.name(ctx.localeCode)),
            onTap: () => Navigator.pop(ctx, c.id),
          ),
        ),
      ],
    ),
  );
  if (chosen == null) return;
  await ref.read(preferredCityProvider.notifier).set(chosen.isEmpty ? null : chosen);
}

String formatDate(BuildContext context, DateTime d) => MaterialLocalizations.of(context).formatMediumDate(d);
String formatTime(BuildContext context, DateTime d) =>
    MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay.fromDateTime(d), alwaysUse24HourFormat: true);
