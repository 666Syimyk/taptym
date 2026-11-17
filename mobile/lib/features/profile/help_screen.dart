import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n_ext.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final faq = [(l.helpQ5, l.helpA5), (l.helpQ1, l.helpA1), (l.helpQ2, l.helpA2), (l.helpQ3, l.helpA3), (l.helpQ4, l.helpA4)];
    final scams = [(l.scam1t, l.scam1d), (l.scam2t, l.scam2d), (l.scam3t, l.scam3d), (l.scam4t, l.scam4d), (l.scam5t, l.scam5d)];
    return Scaffold(
      appBar: AppBar(title: Text(l.help)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(Space.xl, Space.s, Space.xl, Space.xxxl),
        children: [
          InfoNote(title: l.safetyTipsTitle, text: '${l.safetyTip1}\n${l.safetyTip2}\n${l.safetyTip3}', icon: Icons.shield_outlined, color: t.colorScheme.secondary),
          const SizedBox(height: Space.xl),
          Text(l.scamTitle, style: t.textTheme.titleLarge),
          const SizedBox(height: Space.s),
          // Typical lost-and-found scams in plain words: recognising the script is the best defence.
          for (final (title, body) in scams)
            Container(
              padding: const EdgeInsets.symmetric(vertical: Space.m),
              decoration: BoxDecoration(border: Border(bottom: BorderSide(color: t.dividerColor))),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: t.textTheme.titleSmall),
                  const SizedBox(height: 4),
                  Text(body, style: t.textTheme.bodyMedium?.copyWith(color: t.colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
          const SizedBox(height: Space.l),
          InfoNote(text: l.scamHelp, icon: Icons.report_gmailerrorred_rounded, color: t.colorScheme.error),
          const SizedBox(height: Space.xl),
          for (final (q, a) in faq)
            Card(
              margin: const EdgeInsets.only(bottom: Space.s),
              child: ExpansionTile(
                shape: const Border(),
                title: Text(q, style: t.textTheme.titleMedium),
                childrenPadding: const EdgeInsets.fromLTRB(Space.l, 0, Space.l, Space.l),
                children: [Text(a, style: t.textTheme.bodyMedium)],
              ),
            ),
          const SizedBox(height: Space.l),
          Card(
            child: ListTile(
              leading: const Icon(Icons.mail_outline_rounded),
              title: Text(l.contactUs),
              subtitle: Text(l.contactUsSubtitle),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => context.push('/feedback'),
            ),
          ),
        ],
      ),
    );
  }
}
