import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/l10n_ext.dart';
import '../../core/repositories.dart';
import '../../core/session.dart';
import '../../core/storage/prefs.dart';
import '../../shared/widgets.dart';
import '../common.dart';

class LanguageScreen extends ConsumerWidget {
  const LanguageScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(title: Text(context.l10n.language)),
    body: ListView(
      children: ['ru', 'ky', 'en']
          .map(
            (code) => ListTile(
              title: Text(switch (code) {
                'ky' => context.l10n.kyrgyz,
                'en' => context.l10n.english,
                _ => context.l10n.russian,
              }),
              trailing: context.localeCode == code
                  ? const Icon(Icons.check_rounded)
                  : null,
              onTap: () async {
                await ref.read(localeProvider.notifier).set(Locale(code));
                if (ref.read(isSignedInProvider) && context.mounted) {
                  await runAction(context, () async {
                    await ref.read(accountRepositoryProvider).update({
                      'locale': code,
                    });
                  });
                }
              },
            ),
          )
          .toList(),
    ),
  );
}

class AppearanceScreen extends ConsumerWidget {
  const AppearanceScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final names = {
      ThemeMode.system: l.themeSystem,
      ThemeMode.light: l.themeLight,
      ThemeMode.dark: l.themeDark,
    };
    return Scaffold(
      appBar: AppBar(title: Text(l.appearance)),
      body: ListView(
        children: names.entries
            .map(
              (e) => ListTile(
                title: Text(e.value),
                trailing: ref.watch(themeModeProvider) == e.key
                    ? const Icon(Icons.check)
                    : null,
                onTap: () => ref.read(themeModeProvider.notifier).set(e.key),
              ),
            )
            .toList(),
      ),
    );
  }
}

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(context.l10n.privacy)),
    body: Padding(
      padding: const EdgeInsets.all(24),
      child: Text(context.l10n.privacyBody),
    ),
  );
}

class SecurityScreen extends ConsumerStatefulWidget {
  const SecurityScreen({super.key});
  @override
  ConsumerState<SecurityScreen> createState() => _SecurityState();
}

class _SecurityState extends ConsumerState<SecurityScreen> {
  bool busy = false;
  Future<void> act(Future<void> Function() fn) async {
    setState(() => busy = true);
    await runAction(context, fn);
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.security)),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          InfoNote(text: '${l.safetyTip1}\n${l.safetyTip2}\n${l.safetyTip3}'),
          const SizedBox(height: 24),
          BusyButton(
            label: l.revokeAll,
            busy: busy,
            onPressed: () => act(() async {
              await ref.read(accountRepositoryProvider).revokeAll();
              await ref.read(sessionProvider.notifier).signOut(remote: false);
            }),
          ),
          TextButton(
            onPressed: busy
                ? null
                : () async {
                    if (!await confirmAction(
                          context,
                          l.deleteAccount,
                          l.deleteAccountConfirm,
                        ) ||
                        !context.mounted) {
                      return;
                    }
                    await act(() async {
                      await ref.read(accountRepositoryProvider).deleteAccount();
                      await ref
                          .read(sessionProvider.notifier)
                          .signOut(remote: false);
                    });
                  },
            child: Text(
              l.deleteAccount,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        ],
      ),
    );
  }
}

class NotificationSettingsScreen extends ConsumerWidget {
  const NotificationSettingsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final me = ref.watch(sessionProvider).value;
    return Scaffold(
      appBar: AppBar(title: Text(l.notifications)),
      body: ListView(
        children:
            {
              'MATCH_FOUND': l.notifMatches,
              'MESSAGE_RECEIVED': l.notifMessages,
              'ITEM_COMMENT': l.notifComments,
            }
                .entries
                .map(
                  (e) => SwitchListTile(
                    title: Text(e.value),
                    value: me?.notificationPrefs[e.key] ?? true,
                    onChanged: me == null
                        ? null
                        : (v) => runAction(context, () async {
                            await ref.read(accountRepositoryProvider).update({
                              'notificationPrefs': {
                                ...me.notificationPrefs,
                                e.key: v,
                              },
                            });
                            await ref
                                .read(sessionProvider.notifier)
                                .refreshProfile();
                          }),
                  ),
                )
                .toList(),
      ),
    );
  }
}
