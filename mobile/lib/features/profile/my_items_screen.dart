import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../shared/widgets.dart';
import '../common.dart';

final myItemsProvider = FutureProvider.autoDispose<List<Item>>(
  (ref) => ref.watch(itemsRepositoryProvider).mine(),
);

class MyItemsScreen extends ConsumerWidget {
  const MyItemsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(
        title: Text(l.myListings),
        actions: [
          IconButton(
            tooltip: l.retry,
            onPressed: () => ref.invalidate(myItemsProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: AsyncBody(
        value: ref.watch(myItemsProvider),
        retry: () => ref.invalidate(myItemsProvider),
        builder: (items) => items.isEmpty
            ? StateView(
                icon: Icons.inventory_2_outlined,
                title: l.emptySearch,
                actionLabel: l.createListing,
                onAction: () => context.push('/new/found'),
              )
            : RefreshIndicator(
                onRefresh: () => ref.refresh(myItemsProvider.future),
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => ItemCard(
                    item: items[i],
                    showStatus: true,
                    onTap: () async {
                      await context.push('/items/${items[i].id}');
                      ref.invalidate(myItemsProvider);
                    },
                  ),
                ),
              ),
      ),
    );
  }
}
