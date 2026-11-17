import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/l10n_ext.dart';
import '../../core/repositories.dart';
import '../../shared/widgets.dart';

Future<void> showReportSheet(
  BuildContext context,
  String targetType,
  String targetId,
) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (_) => _ReportSheet(targetType: targetType, targetId: targetId),
);

class _ReportSheet extends ConsumerStatefulWidget {
  const _ReportSheet({required this.targetType, required this.targetId});
  final String targetType, targetId;
  @override
  ConsumerState<_ReportSheet> createState() => _ReportState();
}

class _ReportState extends ConsumerState<_ReportSheet> {
  final details = TextEditingController();
  String reason = 'fraud';
  bool busy = false;
  String? error;
  @override
  void dispose() {
    details.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final reasons = {
      'fraud': l.reportReasonFraud,
      'spam': l.reportReasonSpam,
      'inappropriate': l.reportReasonInappropriate,
      'personal_data': l.reportReasonPersonalData,
      'wrong_category': l.reportReasonWrongCategory,
      'harassment': l.reportReasonHarassment,
      'other': l.reportReasonOther,
    };
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
          Text(l.reportTitle, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 20),
          DropdownButtonFormField<String>(
            initialValue: reason,
            items: reasons.entries
                .map(
                  (r) => DropdownMenuItem(value: r.key, child: Text(r.value)),
                )
                .toList(),
            onChanged: (v) => reason = v!,
          ),
          TextField(
            controller: details,
            maxLength: 1000,
            maxLines: 3,
            decoration: InputDecoration(labelText: l.reportDetails),
          ),
          if (error != null) InfoNote(text: error!),
          BusyButton(
            label: l.send,
            busy: busy,
            onPressed: () async {
              setState(() {
                busy = true;
                error = null;
              });
              try {
                await ref
                    .read(accountRepositoryProvider)
                    .report(
                      targetType: widget.targetType,
                      targetId: widget.targetId,
                      reason: reason,
                      details: details.text,
                    );
                if (context.mounted) {
                  Navigator.pop(context);
                  showSnack(context, l.reportSent);
                }
              } catch (e) {
                if (mounted) setState(() => error = errorText(context, e));
              } finally {
                if (mounted) setState(() => busy = false);
              }
            },
          ),
        ],
      ),
    );
  }
}
