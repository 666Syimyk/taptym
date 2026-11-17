import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/router.dart';
import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';
import '../chat/chat_providers.dart';
import '../common.dart';

final notificationsProvider = FutureProvider.autoDispose<List<AppNotification>>(
  (ref) => ref.watch(accountRepositoryProvider).notifications(),
);

IconData _iconFor(String type) => switch (type) {
  'MATCH_FOUND' => Icons.join_inner_rounded,
  'CLAIM_RECEIVED' || 'CLAIM_NEEDS_INFO' => Icons.fact_check_outlined,
  'MESSAGE_RECEIVED' => Icons.chat_bubble_outline_rounded,
  'CLAIM_APPROVED' || 'HANDOFF_COMPLETED' => Icons.check_circle_outline_rounded,
  'CLAIM_REJECTED' => Icons.cancel_outlined,
  'ITEM_NEEDS_FIX' => Icons.rate_review_outlined,
  'SECURITY_WARNING' => Icons.shield_outlined,
  _ => Icons.notifications_none_rounded,
};

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final t = Theme.of(context);
    Future<void> markAll() => runAction(context, () async {
      await ref.read(accountRepositoryProvider).readAllNotifications();
      ref.invalidate(notificationsProvider);
      ref.invalidate(unreadNotificationsProvider);
    });
    return Scaffold(
      appBar: AppBar(
        title: Text(l.notifications),
        actions: [IconButton(tooltip: l.markAllRead, icon: const Icon(Icons.done_all_rounded), onPressed: markAll)],
      ),
      body: AsyncBody(
        value: ref.watch(notificationsProvider),
        retry: () => ref.invalidate(notificationsProvider),
        builder: (items) => items.isEmpty
            ? StateView(icon: Icons.notifications_none_rounded, title: l.notificationsEmpty)
            : RefreshIndicator(
                onRefresh: () => ref.refresh(notificationsProvider.future),
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(Space.xl, Space.m, Space.xl, Space.xxxl),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: Space.s),
                  itemBuilder: (_, i) {
                    final n = items[i];
                    return Card(
                      clipBehavior: Clip.antiAlias,
                      child: ListTile(
                        leading: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(color: (n.unread ? t.colorScheme.primary : t.colorScheme.onSurfaceVariant).withValues(alpha: 0.14), borderRadius: BorderRadius.circular(14)),
                          child: Icon(_iconFor(n.type), color: n.unread ? t.colorScheme.primary : t.colorScheme.onSurfaceVariant),
                        ),
                        title: Text(n.title, style: t.textTheme.titleMedium?.copyWith(fontWeight: n.unread ? FontWeight.w700 : FontWeight.w600)),
                        subtitle: Text('${n.body}\n${Labels.relativeTime(l, n.createdAt)}', maxLines: 3, overflow: TextOverflow.ellipsis),
                        isThreeLine: true,
                        trailing: n.unread ? Container(width: 10, height: 10, decoration: BoxDecoration(color: t.colorScheme.primary, shape: BoxShape.circle)) : null,
                        onTap: () async {
                          if (n.unread) {
                            await runAction(context, () => ref.read(accountRepositoryProvider).readNotification(n.id));
                            ref.invalidate(notificationsProvider);
                            ref.invalidate(unreadNotificationsProvider);
                          }
                          if (context.mounted) openDeepLink(context, n.deepLink);
                        },
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }
}
