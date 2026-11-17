import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n_ext.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';
import '../common.dart';
import 'chat_providers.dart';

class ChatsScreen extends ConsumerWidget {
  const ChatsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final t = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.chatsTitle),
        actions: [IconButton(tooltip: l.retry, onPressed: () => ref.invalidate(conversationsProvider), icon: const Icon(Icons.refresh_rounded))],
      ),
      body: AsyncBody(
        value: ref.watch(conversationsProvider),
        retry: () => ref.invalidate(conversationsProvider),
        builder: (items) => items.isEmpty
            ? StateView(icon: Icons.chat_bubble_outline_rounded, title: l.chatsEmpty)
            : RefreshIndicator(
                onRefresh: () => ref.refresh(conversationsProvider.future),
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(Space.xl, Space.m, Space.xl, Space.xxxl),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: Space.s),
                  itemBuilder: (_, i) {
                    final c = items[i];
                    final last = c.lastMessage;
                    return Card(
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () async {
                          await context.push('/conversations/${c.id}');
                          ref.invalidate(conversationsProvider);
                          ref.invalidate(unreadMessagesProvider);
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(Space.m),
                          child: Row(
                            children: [
                              Badge(
                                isLabelVisible: c.unreadCount > 0,
                                label: Text('${c.unreadCount}'),
                                child: InitialAvatar(name: c.otherName, size: 48),
                              ),
                              const SizedBox(width: Space.m),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(child: Text(c.otherName, maxLines: 1, overflow: TextOverflow.ellipsis, style: t.textTheme.titleMedium)),
                                        if (last != null) Text(Labels.relativeTime(l, last.createdAt), style: t.textTheme.labelSmall),
                                      ],
                                    ),
                                    Text(c.itemTitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: t.textTheme.bodySmall?.copyWith(color: t.colorScheme.primary)),
                                    const SizedBox(height: 2),
                                    Text(
                                      last == null ? '' : (last.isSystem ? '${l.systemMessage}: ${last.body}' : last.body),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: t.textTheme.bodyMedium?.copyWith(fontWeight: c.unreadCount > 0 ? FontWeight.w700 : FontWeight.w400),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }
}
