import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/l10n_ext.dart';
import '../core/network/api_client.dart';
import '../core/storage/prefs.dart';
import '../core/theme/app_theme.dart';
import 'router.dart';

class TabyldyApp extends ConsumerWidget {
  const TabyldyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final themeMode = ref.watch(themeModeProvider);
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'Табылды',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: themeMode,
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      localeResolutionCallback: (device, supported) {
        if (locale != null) return locale;
        if (device != null &&
            supported.any((l) => l.languageCode == device.languageCode)) {
          return device;
        }
        return const Locale('ru');
      },
      routerConfig: router,
      builder: (context, child) {
        // Keep the API Accept-Language in sync with the effective locale.
        final code = Localizations.localeOf(context).languageCode;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (ref.read(acceptLanguageProvider) != code) {
            ref.read(acceptLanguageProvider.notifier).state = code;
          }
        });
        // Respect system text scaling but keep layouts sane (PRD §26).
        final mq = MediaQuery.of(context);
        return MediaQuery(
          data: mq.copyWith(
            textScaler: mq.textScaler.clamp(
              minScaleFactor: 0.9,
              maxScaleFactor: 1.4,
            ),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
