import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';
import '../common.dart';

final claimsListProvider = FutureProvider.autoDispose.family<List<Claim>, (String?, bool)>((ref, args) {
  final repo = ref.watch(claimsRepositoryProvider);
  return args.$1 != null
      ? repo.forItem(args.$1!)
      : args.$2
      ? repo.incoming()
      : repo.mine();
});

class ClaimsListScreen extends ConsumerWidget {
  const ClaimsListScreen({super.key, this.itemId, this.incoming = false});
  final String? itemId;
  final bool incoming;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final provider = claimsListProvider((itemId, incoming));
    final isIncoming = incoming || itemId != null;
    return Scaffold(
      appBar: AppBar(
        title: Text(isIncoming ? l.incomingClaims : l.myClaims),
        actions: [IconButton(tooltip: l.retry, onPressed: () => ref.invalidate(provider), icon: const Icon(Icons.refresh_rounded))],
      ),
      body: AsyncBody(
        value: ref.watch(provider),
        retry: () => ref.invalidate(provider),
        builder: (items) => items.isEmpty
            ? StateView(icon: Icons.fact_check_outlined, title: isIncoming ? l.claimsEmptyIncoming : l.claimsEmptyMine)
            : RefreshIndicator(
                onRefresh: () => ref.refresh(provider.future),
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(Space.xl, Space.m, Space.xl, Space.xxxl),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: Space.m),
                  itemBuilder: (_, i) => ClaimCard(
                    claim: items[i],
                    onTap: () async {
                      await context.push('/claims/${items[i].id}');
                      ref.invalidate(provider);
                    },
                  ),
                ),
              ),
      ),
    );
  }
}

class ClaimCard extends StatelessWidget {
  const ClaimCard({super.key, required this.claim, this.onTap});
  final Claim claim;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(Space.m),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(color: claimStatusColor(claim.status).withValues(alpha: 0.14), borderRadius: BorderRadius.circular(16)),
                child: Icon(claim.kind == 'OWNERSHIP' ? Icons.back_hand_outlined : Icons.lightbulb_outline_rounded, color: claimStatusColor(claim.status)),
              ),
              const SizedBox(width: Space.m),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(claim.itemTitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: t.textTheme.titleMedium),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        StatusChip(label: Labels.claimStatus(l, claim.status), color: claimStatusColor(claim.status)),
                        const SizedBox(width: 8),
                        Flexible(child: Text(Labels.relativeTime(l, claim.submittedAt), style: t.textTheme.labelSmall, overflow: TextOverflow.ellipsis)),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }
}
