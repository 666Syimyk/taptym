import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n_ext.dart';
import '../../core/storage/prefs.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';

/// Three screens max (PRD §8.2) with Continue / Skip / Choose language.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});
  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingState();
}

class _OnboardingState extends ConsumerState<OnboardingScreen> {
  final controller = PageController();
  int page = 0;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  Future<void> finish() async {
    await ref.read(onboardingDoneProvider.notifier).complete();
    if (mounted) context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final pages = [
      (Icons.travel_explore_rounded, l.onboarding1Title, l.onboarding1Body, TabyldyColors.primary),
      (Icons.photo_camera_rounded, l.onboarding2Title, l.onboarding2Body, TabyldyColors.accentMint),
      (Icons.verified_user_rounded, l.onboarding3Title, l.onboarding3Body, TabyldyColors.primaryDeep),
    ];
    return Scaffold(
      body: SoftBackground(
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 12, 0),
                child: Row(
                  children: [
                    const _Logo(),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          onPressed: () => showLanguageSheet(context, ref),
                          icon: const Icon(Icons.language_rounded, size: 18),
                          label: Text(l.chooseLanguage, maxLines: 1, overflow: TextOverflow.ellipsis),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: controller,
                  itemCount: pages.length,
                  onPageChanged: (i) => setState(() => page = i),
                  itemBuilder: (_, i) {
                    final (icon, title, body, color) = pages[i];
                    return SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(28, 24, 28, 16),
                      child: Column(
                        children: [
                          const SizedBox(height: 24),
                          GlassPanel(
                            radius: 48,
                            padding: const EdgeInsets.all(40),
                            tint: color.withValues(alpha: 0.12),
                            child: Icon(icon, size: 88, color: color),
                          ),
                          const SizedBox(height: 40),
                          Text(title, textAlign: TextAlign.center, style: t.textTheme.displaySmall),
                          const SizedBox(height: 16),
                          Text(body, textAlign: TextAlign.center, style: t.textTheme.bodyLarge?.copyWith(color: t.colorScheme.onSurfaceVariant)),
                        ],
                      ),
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(28, 0, 28, 20),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(
                        pages.length,
                        (i) => AnimatedContainer(
                          duration: Motion.card,
                          margin: const EdgeInsets.all(4),
                          width: i == page ? 26 : 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: i == page ? t.colorScheme.primary : t.colorScheme.outline,
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: () => page < pages.length - 1
                          ? controller.nextPage(duration: Motion.screen, curve: Motion.spring)
                          : finish(),
                      child: Text(page == pages.length - 1 ? l.getStarted : l.continueLabel),
                    ),
                    TextButton(onPressed: finish, child: Text(l.skip)),
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

class _Logo extends StatelessWidget {
  const _Logo();
  @override
  Widget build(BuildContext context) => Row(
    children: [
      const AppLogoMark(size: 32),
      const SizedBox(width: 10),
      Text(context.l10n.appName, style: Theme.of(context).textTheme.titleLarge),
    ],
  );
}

/// Brand mark: a rounded tile with a return-arrow glyph (find → connect → return).
class AppLogoMark extends StatelessWidget {
  const AppLogoMark({super.key, this.size = 36});
  final double size;
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(size * 0.32),
      gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [TabyldyColors.primary, TabyldyColors.primaryDeep]),
      boxShadow: [BoxShadow(color: TabyldyColors.primary.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))],
    ),
    child: CustomPaint(painter: _FoundMarkPainter()),
  );
}

/// A magnifier with a check mark: "searched — found".
class _FoundMarkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final stroke = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.09
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final c = Offset(w * 0.44, w * 0.44);
    final r = w * 0.22;
    canvas.drawCircle(c, r, stroke);
    canvas.drawLine(Offset(w * 0.6, w * 0.6), Offset(w * 0.76, w * 0.76), stroke);
    final check = Path()
      ..moveTo(w * 0.35, w * 0.45)
      ..lineTo(w * 0.42, w * 0.52)
      ..lineTo(w * 0.54, w * 0.38);
    canvas.drawPath(check, stroke..strokeWidth = w * 0.07);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

Future<void> showLanguageSheet(BuildContext context, WidgetRef ref) async {
  final l = context.l10n;
  final current = context.localeCode;
  await showAppSheet<void>(
    context,
    builder: (ctx) => Padding(
      padding: const EdgeInsets.fromLTRB(8, 0, 8, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: Align(alignment: Alignment.centerLeft, child: Text(l.languageSheetTitle, style: Theme.of(ctx).textTheme.headlineSmall)),
          ),
          for (final (code, name) in [('ru', l.russian), ('ky', l.kyrgyz), ('en', l.english)])
            ListTile(
              leading: const Icon(Icons.translate_rounded),
              title: Text(name),
              trailing: current == code ? const Icon(Icons.check_rounded) : null,
              onTap: () async {
                await ref.read(localeProvider.notifier).set(Locale(code));
                if (ctx.mounted) Navigator.pop(ctx);
              },
            ),
        ],
      ),
    ),
  );
}
