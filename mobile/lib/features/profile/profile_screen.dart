import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/config.dart';
import '../../core/l10n_ext.dart';
import '../../core/repositories.dart';
import '../../core/session.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';
import '../auth/auth_sheet.dart';
import '../chat/chat_providers.dart';
import '../common.dart';

/// Profile (PRD §8.14): account card, my listings/messages/claims/returns/notifications,
/// language, appearance, privacy, security, help, delete account, sign out.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final t = Theme.of(context);
    final session = ref.watch(sessionProvider);
    final me = session.value;
    final unreadMsgs = ref.watch(unreadMessagesProvider).value ?? 0;
    final unreadNotifs = ref.watch(unreadNotificationsProvider).value ?? 0;

    Widget link(IconData icon, String label, String path, {bool auth = false, int badge = 0}) => ListTile(
      leading: Icon(icon),
      title: Text(label),
      trailing: badge > 0 ? StatusChip(label: '$badge') : const Icon(Icons.chevron_right_rounded),
      onTap: () => auth ? requireAuth(context, ref, () async => context.push(path)) : context.push(path),
    );
    Widget group(String title, List<Widget> children) => Padding(
      padding: const EdgeInsets.only(bottom: Space.l),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(padding: const EdgeInsets.fromLTRB(Space.s, 0, Space.s, Space.s), child: Text(title, style: t.textTheme.labelSmall?.copyWith(letterSpacing: 0.6))),
          Card(child: Column(children: [for (final (i, c) in children.indexed) ...[if (i > 0) const Divider(height: 1), c]])),
        ],
      ),
    );

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(Space.xl, 0, Space.xl, 120),
        children: [
          SafeArea(bottom: false, child: Padding(padding: const EdgeInsets.fromLTRB(0, Space.m, 0, Space.l), child: Text(l.profileTitle, style: t.textTheme.headlineMedium))),
          if (session.isLoading) const Padding(padding: EdgeInsets.only(bottom: Space.m), child: LinearProgressIndicator()),
          if (me == null || me.isGuest)
            GlassPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const InitialAvatar(name: '', size: 52),
                      const SizedBox(width: Space.m),
                      Expanded(child: Text(l.homeGreetingGuest, style: t.textTheme.titleLarge)),
                    ],
                  ),
                  const SizedBox(height: Space.m),
                  Text(l.guestProfileBody, style: t.textTheme.bodyMedium),
                  const SizedBox(height: Space.l),
                  FilledButton.icon(onPressed: () => showAuthSheet(context), icon: const Icon(Icons.verified_user_outlined), label: Text(l.authTitle)),
                ],
              ),
            )
          else
            GlassPanel(
              child: Row(
                children: [
                  InitialAvatar(name: me.publicName, size: 56),
                  const SizedBox(width: Space.m),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(me.publicName.isEmpty ? l.publicName : me.publicName, style: t.textTheme.titleLarge),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            StatusChip(label: Labels.trust(l, me.trustLevel), color: TabyldyColors.success, icon: Icons.verified_rounded),
                            StatusChip(label: l.activeListings(me.activeItems), color: t.colorScheme.primary),
                          ],
                        ),
                        if (me.contacts.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(me.contacts.map((c) => c.masked).join(' · '), style: t.textTheme.bodySmall),
                        ],
                      ],
                    ),
                  ),
                  IconButton(tooltip: l.edit, icon: const Icon(Icons.edit_outlined), onPressed: () => _editName(context, ref, me.publicName)),
                ],
              ),
            ),
          const SizedBox(height: Space.xl),
          group(l.sectionMine, [
            link(Icons.inventory_2_outlined, l.myListings, '/me/items', auth: true),
            link(Icons.fact_check_outlined, l.myClaims, '/claims', auth: true),
            link(Icons.inbox_outlined, l.incomingClaims, '/claims?incoming=1', auth: true),
            link(Icons.chat_bubble_outline_rounded, l.myMessages, '/conversations', auth: true, badge: unreadMsgs),
            link(Icons.handshake_outlined, l.returnsHistory, '/me/returns', auth: true),
            link(Icons.notifications_outlined, l.notifications, '/notifications', auth: true, badge: unreadNotifs),
          ]),
          group(l.sectionSettings, [
            link(Icons.language_rounded, l.language, '/settings/language'),
            link(Icons.palette_outlined, l.appearance, '/settings/appearance'),
            link(Icons.notifications_active_outlined, l.notifications, '/settings/notifications', auth: true),
          ]),
          group(l.sectionSafety, [
            link(Icons.lock_outline_rounded, l.privacy, '/settings/privacy'),
            link(Icons.shield_outlined, l.security, '/settings/security', auth: true),
            link(Icons.help_outline_rounded, l.help, '/help'),
            link(Icons.mail_outline_rounded, l.contactUs, '/feedback'),
          ]),
          // A guest has no contact to sign back in with — logging out would lose their posts.
          if (me != null && !me.isGuest)
            OutlinedButton.icon(
              onPressed: () async {
                if (await confirmAction(context, l.logout, me.publicName, confirmLabel: l.logout)) ref.read(sessionProvider.notifier).signOut();
              },
              icon: const Icon(Icons.logout_rounded, size: 18),
              label: Text(l.logout),
            ),
          const SizedBox(height: Space.l),
          Center(child: Text('${l.appName} · ${l.versionLabel(AppConfig.appVersion)}', style: t.textTheme.labelSmall)),
        ],
      ),
    );
  }

  Future<void> _editName(BuildContext context, WidgetRef ref, String current) async {
    final l = context.l10n;
    final c = TextEditingController(text: current);
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.publicName),
        content: TextField(controller: c, maxLength: 40, autofocus: true, textCapitalization: TextCapitalization.words),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.cancel)),
          FilledButton(
            onPressed: () {
              if (c.text.trim().length >= 2) Navigator.pop(ctx, c.text.trim());
            },
            child: Text(l.save),
          ),
        ],
      ),
    );
    if (name != null && context.mounted) {
      await runAction(context, () async {
        await ref.read(accountRepositoryProvider).update({'publicName': name});
        await ref.read(sessionProvider.notifier).refreshProfile();
      });
    }
  }
}
