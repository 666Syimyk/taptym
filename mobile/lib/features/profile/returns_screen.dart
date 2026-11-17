import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';
import '../claims/claims_list_screen.dart';
import '../common.dart';

/// Completed returns — both as item owner and as claimant (PRD §8.14).
final returnsProvider = FutureProvider.autoDispose<List<Claim>>((ref) async {
  final repo = ref.watch(claimsRepositoryProvider);
  final results = await Future.wait([repo.mine(), repo.incoming()]);
  final all = {for (final c in results.expand((x) => x)) c.id: c}.values.where((c) => c.status == 'COMPLETED').toList()
    ..sort((a, b) => b.submittedAt.compareTo(a.submittedAt));
  return all;
});

class ReturnsScreen extends ConsumerWidget {
  const ReturnsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.returnsHistory)),
      body: AsyncBody(
        value: ref.watch(returnsProvider),
        retry: () => ref.invalidate(returnsProvider),
        builder: (items) => items.isEmpty
            ? StateView(icon: Icons.handshake_outlined, title: l.returnsEmpty)
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(Space.xl, Space.m, Space.xl, Space.xxxl),
                itemCount: items.length,
                separatorBuilder: (_, _) => const SizedBox(height: Space.m),
                itemBuilder: (_, i) => ClaimCard(claim: items[i], onTap: () => context.push('/claims/${items[i].id}')),
              ),
      ),
    );
  }
}
