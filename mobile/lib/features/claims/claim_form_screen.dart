import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';
import '../common.dart';
import '../item/item_detail_screen.dart';

class _EvidenceEntry {
  _EvidenceEntry({this.type = 'unique_feature'});
  String type;
  final text = TextEditingController();
  UploadedMedia? attachment;
  bool uploading = false;
}

/// Owner verification form (PRD §8.11): several evidence entries, each with a type,
/// a description and an optional old photo. Sent through the protected contour.
class ClaimFormScreen extends ConsumerStatefulWidget {
  const ClaimFormScreen({super.key, required this.itemId});
  final String itemId;
  @override
  ConsumerState<ClaimFormScreen> createState() => _ClaimFormState();
}

class _ClaimFormState extends ConsumerState<ClaimFormScreen> {
  final message = TextEditingController();
  final entries = [_EvidenceEntry()];
  bool busy = false;

  @override
  void dispose() {
    message.dispose();
    for (final e in entries) {
      e.text.dispose();
    }
    super.dispose();
  }

  Future<void> attach(_EvidenceEntry e) async {
    setState(() => e.uploading = true);
    await runAction(context, () async {
      final photo = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 2400, maxHeight: 2400, imageQuality: 88);
      if (photo == null) return;
      e.attachment = await ref.read(mediaRepositoryProvider).upload(await photo.readAsBytes(), filename: photo.name, suggestions: false);
    });
    if (mounted) setState(() => e.uploading = false);
  }

  Future<void> submit() async {
    final l = context.l10n;
    final evidence = [
      for (final e in entries)
        if (e.text.text.trim().isNotEmpty || e.attachment != null)
          {'type': e.type, 'text': e.text.text.trim(), if (e.attachment != null) 'mediaId': e.attachment!.id},
    ];
    if (evidence.isEmpty) {
      showSnack(context, l.addEvidence, error: true);
      return;
    }
    setState(() => busy = true);
    await runAction(context, () async {
      final claim = await ref.read(claimsRepositoryProvider).create(widget.itemId, message: message.text.trim(), evidence: evidence);
      if (mounted) {
        showSnack(context, l.claimSubmitted);
        context.replace('/claims/${claim.id}');
      }
    });
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final item = ref.watch(itemProvider(widget.itemId)).value;
    final isFoundReport = item?.isLost ?? false;
    final anyUploading = entries.any((e) => e.uploading);
    return Scaffold(
      appBar: AppBar(title: Text(l.claimTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(Space.xl, Space.s, Space.xl, Space.xxxl),
        children: [
          if (item != null) ...[ItemCard(item: item), const SizedBox(height: Space.l)],
          InfoNote(text: isFoundReport ? l.claimFoundReportIntro : l.claimIntro, icon: Icons.shield_outlined),
          const SizedBox(height: Space.xl),
          TextField(
            controller: message,
            maxLength: 400,
            maxLines: 3,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(labelText: l.claimMessage, alignLabelWithHint: true),
          ),
          const SizedBox(height: Space.s),
          Text(l.evidenceFromClaimant, style: t.textTheme.titleMedium),
          const SizedBox(height: Space.s),
          for (final (i, e) in entries.indexed)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(Space.m),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: e.type,
                            decoration: InputDecoration(labelText: l.evidenceType),
                            items: [
                              for (final type in ['unique_feature', 'contents', 'purchase_proof', 'old_photo', 'other'])
                                DropdownMenuItem(value: type, child: Text(Labels.evidenceType(l, type))),
                            ],
                            onChanged: (v) => setState(() => e.type = v ?? e.type),
                          ),
                        ),
                        if (entries.length > 1)
                          IconButton(
                            tooltip: l.delete,
                            icon: const Icon(Icons.close_rounded),
                            onPressed: () => setState(() => entries.removeAt(i)),
                          ),
                      ],
                    ),
                    const SizedBox(height: Space.s),
                    TextField(
                      controller: e.text,
                      maxLength: 600,
                      maxLines: 4,
                      minLines: 2,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: InputDecoration(labelText: l.evidenceText, hintText: l.evidenceHint, alignLabelWithHint: true),
                    ),
                    Row(
                      children: [
                        if (e.attachment == null)
                          TextButton.icon(
                            onPressed: e.uploading || busy ? null : () => attach(e),
                            icon: const Icon(Icons.add_photo_alternate_outlined, size: 18),
                            label: Text(l.pickFromGallery),
                          )
                        else ...[
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: SizedBox(width: 44, height: 44, child: e.attachment!.publicUrl != null ? NetImage(url: e.attachment!.publicUrl!) : const Icon(Icons.lock_outline_rounded)),
                          ),
                          const SizedBox(width: Space.s),
                          Expanded(child: Text(l.evidenceOldPhoto, style: t.textTheme.bodySmall)),
                          IconButton(tooltip: l.delete, icon: const Icon(Icons.close_rounded), onPressed: () => setState(() => e.attachment = null)),
                        ],
                        if (e.uploading) const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          if (entries.length < 5)
            TextButton.icon(
              onPressed: () => setState(() => entries.add(_EvidenceEntry(type: 'other'))),
              icon: const Icon(Icons.add_rounded),
              label: Text(l.addEvidence),
            ),
          const SizedBox(height: Space.l),
          InfoNote(text: l.safetyTip2, icon: Icons.privacy_tip_outlined, color: t.colorScheme.tertiary),
        ],
      ),
      bottomNavigationBar: GlassActionBar(
        child: BusyButton(label: l.submitClaim, icon: Icons.send_rounded, busy: busy, onPressed: anyUploading ? null : submit),
      ),
    );
  }
}
