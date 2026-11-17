import 'package:flutter/material.dart';

import 'tokens.dart';

/// Soft Glass theme (PRD §6), using the platform font with offline Cyrillic support.
class AppTheme {
  static TextTheme _textTheme(Brightness b) {
    final base = b == Brightness.dark
        ? ThemeData.dark().textTheme
        : ThemeData.light().textTheme;
    final color = b == Brightness.dark ? Colors.white : TabyldyColors.mainText;
    final secondary = b == Brightness.dark
        ? const Color(0xFFB8C2D4)
        : TabyldyColors.secondaryText;
    final t = base;
    return t.copyWith(
      displaySmall: t.displaySmall?.copyWith(
        fontSize: 32,
        fontWeight: FontWeight.w800,
        color: color,
        height: 1.15,
      ),
      headlineMedium: t.headlineMedium?.copyWith(
        fontSize: 24,
        fontWeight: FontWeight.w700,
        color: color,
      ),
      headlineSmall: t.headlineSmall?.copyWith(
        fontSize: 21,
        fontWeight: FontWeight.w700,
        color: color,
      ),
      titleLarge: t.titleLarge?.copyWith(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: color,
      ),
      titleMedium: t.titleMedium?.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: color,
      ),
      bodyLarge: t.bodyLarge?.copyWith(fontSize: 16, color: color, height: 1.4),
      bodyMedium: t.bodyMedium?.copyWith(
        fontSize: 14,
        color: color,
        height: 1.4,
      ),
      bodySmall: t.bodySmall?.copyWith(fontSize: 13, color: secondary),
      labelLarge: t.labelLarge?.copyWith(
        fontSize: 15,
        fontWeight: FontWeight.w600,
      ),
      labelSmall: t.labelSmall?.copyWith(
        fontSize: 12,
        color: secondary,
        letterSpacing: 0.2,
      ),
    );
  }

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness b) {
    final dark = b == Brightness.dark;
    final scheme = ColorScheme(
      brightness: b,
      primary: TabyldyColors.primary,
      onPrimary: Colors.white,
      primaryContainer: dark
          ? TabyldyColors.primaryDeep
          : const Color(0xFFDCE9FF),
      onPrimaryContainer: dark ? Colors.white : TabyldyColors.primaryDeep,
      secondary: TabyldyColors.accentMint,
      onSecondary: Colors.white,
      secondaryContainer: dark
          ? const Color(0xFF14463C)
          : const Color(0xFFD6F5EC),
      onSecondaryContainer: dark ? Colors.white : const Color(0xFF0E5C49),
      tertiary: TabyldyColors.warning,
      onTertiary: Colors.white,
      error: TabyldyColors.error,
      onError: Colors.white,
      surface: dark ? TabyldyColors.darkSurface : TabyldyColors.lightSurface,
      onSurface: dark ? Colors.white : TabyldyColors.mainText,
      onSurfaceVariant: dark
          ? const Color(0xFFB8C2D4)
          : TabyldyColors.secondaryText,
      outline: dark ? const Color(0xFF2E3D55) : const Color(0xFFDDE5F2),
      outlineVariant: dark ? const Color(0xFF24324A) : const Color(0xFFEAF0FA),
      surfaceContainerHighest: dark
          ? const Color(0xFF1F2F47)
          : const Color(0xFFEAF1FD),
      surfaceContainerLow: dark
          ? const Color(0xFF111C2E)
          : const Color(0xFFF9FBFF),
      shadow: Colors.black,
      scrim: Colors.black,
      inverseSurface: dark ? Colors.white : TabyldyColors.mainText,
      onInverseSurface: dark ? TabyldyColors.mainText : Colors.white,
      inversePrimary: dark
          ? const Color(0xFFDCE9FF)
          : TabyldyColors.primaryDeep,
    );
    final text = _textTheme(b);
    return ThemeData(
      useMaterial3: true,
      brightness: b,
      colorScheme: scheme,
      scaffoldBackgroundColor: dark
          ? TabyldyColors.darkBackground
          : TabyldyColors.lightBackground,
      textTheme: text,
      splashFactory: InkSparkle.splashFactory,
      visualDensity: VisualDensity.standard,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: text.headlineSmall,
        iconTheme: IconThemeData(color: scheme.onSurface),
      ),
      cardTheme: CardThemeData(
        color: scheme.surface,
        elevation: 0,
        shadowColor: Colors.black.withValues(alpha: 0.06),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.card),
        ),
        margin: EdgeInsets.zero,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Radii.button),
          ),
          textStyle: text.labelLarge,
          animationDuration: Motion.tap,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Radii.button),
          ),
          side: BorderSide(color: scheme.outline),
          textStyle: text.labelLarge,
          foregroundColor: scheme.onSurface,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(48, 44),
          textStyle: text.labelLarge,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: Space.l,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.button),
          borderSide: BorderSide(color: scheme.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.button),
          borderSide: BorderSide(color: scheme.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.button),
          borderSide: const BorderSide(
            color: TabyldyColors.primary,
            width: 1.5,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.button),
          borderSide: const BorderSide(color: TabyldyColors.error),
        ),
        hintStyle: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.chip),
        ),
        side: BorderSide(color: scheme.outline),
        backgroundColor: scheme.surface,
        selectedColor: scheme.primaryContainer,
        labelStyle: text.bodyMedium,
        showCheckmark: false,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(Radii.sheet),
          ),
        ),
        showDragHandle: true,
      ),
      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant,
        space: 1,
        thickness: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.button),
        ),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: PredictiveBackPageTransitionsBuilder(),
          TargetPlatform.iOS: FadeUpwardsPageTransitionsBuilder(),
          TargetPlatform.windows: FadeUpwardsPageTransitionsBuilder(),
          TargetPlatform.macOS: FadeUpwardsPageTransitionsBuilder(),
          TargetPlatform.linux: FadeUpwardsPageTransitionsBuilder(),
        },
      ),
    );
  }
}
