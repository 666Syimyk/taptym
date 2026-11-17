import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n_ext.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';

/// Completion screen (PRD §10 step 10): short, with a real next action.
class SuccessScreen extends StatelessWidget {
  const SuccessScreen({super.key, required this.itemId, required this.type, required this.status, required this.matches});
  final String itemId, type, status;
  final int matches;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final pending = status == 'PENDING_REVIEW';
    final reduce = MediaQuery.of(context).disableAnimations;
    return Scaffold(
      body: SoftBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(Space.xxxl),
            child: Column(
              children: [
                const Spacer(),
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: reduce ? 1 : 0.6, end: 1),
                  duration: Motion.sheet,
                  curve: Curves.easeOutBack,
                  builder: (_, v, child) => Transform.scale(scale: v, child: child),
                  child: GlassPanel(
                    radius: 60,
                    padding: const EdgeInsets.all(32),
                    tint: (pending ? TabyldyColors.warning : TabyldyColors.success).withValues(alpha: 0.14),
                    child: Icon(pending ? Icons.pending_actions_rounded : Icons.check_rounded, size: 72, color: pending ? TabyldyColors.warning : TabyldyColors.success),
                  ),
                ),
                const SizedBox(height: Space.xxxl),
                Text(type == 'FOUND' ? l.successFoundTitle : l.successLostTitle, textAlign: TextAlign.center, style: t.textTheme.headlineMedium),
                const SizedBox(height: Space.m),
                Text(
                  pending ? l.successPendingReview : (matches > 0 ? l.matchesFoundCount(matches) : l.tagline),
                  textAlign: TextAlign.center,
                  style: t.textTheme.bodyLarge?.copyWith(color: t.colorScheme.onSurfaceVariant),
                ),
                const Spacer(),
                if (matches > 0 && !pending) ...[
                  FilledButton.icon(
                    onPressed: () => _openFromHome(context, '/items/$itemId/matches'),
                    icon: const Icon(Icons.join_inner_rounded),
                    label: Text(l.viewMatches),
                  ),
                  const SizedBox(height: Space.s),
                  OutlinedButton(onPressed: () => _openFromHome(context, '/items/$itemId'), child: Text(l.viewListing)),
                ] else
                  FilledButton(onPressed: () => _openFromHome(context, '/items/$itemId'), child: Text(l.viewListing)),
                TextButton(onPressed: () => context.go('/home'), child: Text(l.toHome)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Opens a page above Home rather than replacing the whole history, so the back
/// arrow on it returns to Home instead of doing nothing.
void _openFromHome(BuildContext context, String path) {
  final router = GoRouter.of(context);
  router.go('/home');
  router.push(path);
}
