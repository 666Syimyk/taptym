import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/l10n_ext.dart';
import '../core/theme/glass.dart';
import '../core/theme/tokens.dart';
import '../features/chat/chat_providers.dart';
import 'router.dart';

/// Bottom navigation: Home | Lost | Camera | Found | Profile (PRD §5.1). The camera is a
/// raised button that opens the "I found" flow outside the tab stack (§5.2).
class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.shell});
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final unread = ref.watch(unreadMessagesProvider).value ?? 0;
    return Scaffold(
      extendBody: true,
      body: SoftBackground(child: shell),
      bottomNavigationBar: SafeArea(
        top: false,
        minimum: const EdgeInsets.fromLTRB(Space.m, 0, Space.m, Space.s),
        child: GlassPanel(
          radius: 28,
          padding: const EdgeInsets.symmetric(horizontal: Space.s, vertical: Space.s),
          child: Row(
            children: [
              _Tab(icon: Icons.home_outlined, activeIcon: Icons.home_rounded, label: l.navHome, index: 0, shell: shell),
              _Tab(icon: Icons.manage_search_outlined, activeIcon: Icons.manage_search_rounded, label: l.navLost, index: 1, shell: shell),
              _CameraButton(
                label: l.navCamera,
                onTap: () => requireAuth(context, ref, () async => context.push('/new/found')),
              ),
              _Tab(icon: Icons.inventory_2_outlined, activeIcon: Icons.inventory_2_rounded, label: l.navFound, index: 2, shell: shell),
              _Tab(icon: Icons.person_outline_rounded, activeIcon: Icons.person_rounded, label: l.navProfile, index: 3, shell: shell, badge: unread),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({required this.icon, required this.activeIcon, required this.label, required this.index, required this.shell, this.badge = 0});
  final IconData icon, activeIcon;
  final String label;
  final int index, badge;
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    final active = shell.currentIndex == index;
    final scheme = Theme.of(context).colorScheme;
    return Expanded(
      child: Semantics(
        button: true,
        selected: active,
        label: label,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          // Tapping the active tab brings its feed back to the top (initialLocation: true).
          onTap: () => shell.goBranch(index, initialLocation: active),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedContainer(
                  duration: Motion.tap,
                  curve: Motion.spring,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  decoration: BoxDecoration(
                    color: active ? scheme.primaryContainer : Colors.transparent,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Badge(
                    isLabelVisible: badge > 0,
                    label: Text('$badge'),
                    child: Icon(active ? activeIcon : icon, color: active ? scheme.onPrimaryContainer : scheme.onSurfaceVariant, size: 24),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: active ? scheme.onSurface : scheme.onSurfaceVariant,
                    fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CameraButton extends StatefulWidget {
  const _CameraButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;
  @override
  State<_CameraButton> createState() => _CameraButtonState();
}

class _CameraButtonState extends State<_CameraButton> {
  bool pressed = false;
  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: widget.label,
      child: GestureDetector(
        onTapDown: (_) => setState(() => pressed = true),
        onTapCancel: () => setState(() => pressed = false),
        onTapUp: (_) => setState(() => pressed = false),
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: pressed ? 0.9 : 1,
          duration: Motion.tap,
          curve: Curves.easeOutBack,
          child: Container(
            width: 56,
            height: 56,
            margin: const EdgeInsets.symmetric(horizontal: 6),
            decoration: BoxDecoration(
              color: TabyldyColors.primary,
              borderRadius: BorderRadius.circular(Radii.button + 2),
            ),
            child: const Icon(Icons.photo_camera_rounded, color: Colors.white, size: 26),
          ),
        ),
      ),
    );
  }
}
