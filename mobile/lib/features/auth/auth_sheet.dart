import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/l10n_ext.dart';
import '../../core/network/api_client.dart';
import '../../core/session.dart';
import '../../shared/widgets.dart';

Future<bool?> showAuthSheet(BuildContext context) => showModalBottomSheet<bool>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (_) => const _AuthSheet(),
);

class _AuthSheet extends ConsumerStatefulWidget {
  const _AuthSheet();
  @override
  ConsumerState<_AuthSheet> createState() => _AuthState();
}

class _AuthState extends ConsumerState<_AuthSheet> {
  final destination = TextEditingController(), code = TextEditingController();
  String channel = 'phone';
  String? challenge, devCode, error;
  bool busy = false;
  @override
  void dispose() {
    destination.dispose();
    code.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final flow = ref.read(authFlowProvider);
      if (challenge == null) {
        final result = await flow.start(channel, destination.text.trim());
        if (mounted) {
          setState(() {
            challenge = result.challengeId;
            devCode = result.devCode;
          });
        }
      } else {
        final guestRefresh = ref.read(isGuestProvider)
            ? await ref.read(tokenStoreProvider).refreshToken()
            : null;
        if (!mounted) return;
        final result = await flow.verify(
          challenge!,
          code.text.trim(),
          locale: context.localeCode,
          platform: kIsWeb ? 'web' : defaultTargetPlatform.name,
          guestRefreshToken: guestRefresh,
        );
        await ref
            .read(sessionProvider.notifier)
            .signedIn(result.access, result.refresh, result.userId);
        if (mounted && ref.read(isSignedInProvider)) {
          Navigator.pop(context, true);
        }
      }
    } catch (e) {
      if (mounted) setState(() => error = errorText(context, e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        24,
        24,
        24,
        MediaQuery.viewInsetsOf(context).bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.authTitle, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          Text(l.authBody),
          const SizedBox(height: 20),
          if (challenge == null) ...[
            SegmentedButton<String>(
              segments: [
                ButtonSegment(value: 'phone', label: Text(l.phone)),
                ButtonSegment(value: 'email', label: Text(l.email)),
              ],
              selected: {channel},
              onSelectionChanged: busy
                  ? null
                  : (v) => setState(() => channel = v.first),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: destination,
              keyboardType: channel == 'phone'
                  ? TextInputType.phone
                  : TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: channel == 'phone' ? l.phone : l.email,
                hintText: channel == 'phone' ? l.phoneHint : l.emailHint,
              ),
              onSubmitted: (_) => busy ? null : submit(),
            ),
          ] else ...[
            Text(l.codeSentTo),
            TextField(
              controller: code,
              autofocus: true,
              keyboardType: TextInputType.number,
              maxLength: 6,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(labelText: l.codeField),
              onSubmitted: (_) => busy ? null : submit(),
            ),
            if (devCode != null) InfoNote(text: l.devCodeHint(devCode!)),
            TextButton(
              onPressed: busy
                  ? null
                  : () => setState(() {
                      challenge = null;
                      code.clear();
                    }),
              child: Text(l.resendCode),
            ),
          ],
          if (error != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          const SizedBox(height: 16),
          BusyButton(
            label: challenge == null ? l.sendCode : l.verify,
            busy: busy,
            onPressed: submit,
          ),
        ],
      ),
    );
  }
}
