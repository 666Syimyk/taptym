import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';

import '../../core/l10n_ext.dart';
import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../core/storage/prefs.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../shared/widgets.dart';
import '../home/home_screen.dart';
import 'listing_draft.dart';
import 'wizard_steps.dart';

enum WizardStep { photo, details, place, attributes, hidden, review }

/// Short-step publication flow (PRD §8.8 / §8.9 / §10 / §11). The found flow starts
/// with the camera; the lost flow starts with the category. Every step validates
/// only what it shows, and the last step previews the exact public card.
class ListingWizard extends ConsumerStatefulWidget {
  const ListingWizard({super.key, required this.type, this.item});
  final String type;
  final Item? item;
  @override
  ConsumerState<ListingWizard> createState() => _ListingWizardState();
}

class _ListingWizardState extends ConsumerState<ListingWizard> {
  late ListingDraft draft;
  late final List<WizardStep> steps;
  int index = 0;
  bool busy = false, restorePending = false;

  /// Details step was skipped because the AI filled it; Back returns to the photo.
  bool skippedDetails = false;
  static const _phoneKey = 'listing_contact_phone';

  void _prefillPhone() {
    if (draft.contactPhone.isEmpty) {
      draft.contactPhone =
          ref.read(jsonCacheProvider).get<String>(_phoneKey) ?? '';
    }
  }

  String? error;
  Timer? saveTimer;
  final detailsForm = GlobalKey<FormState>();

  bool get editing => widget.item != null;
  String get draftKey =>
      widget.type == 'FOUND' ? PrefKeys.foundDraft : PrefKeys.lostDraft;

  @override
  void initState() {
    super.initState();
    steps = widget.type == 'FOUND'
        ? const [
            WizardStep.photo,
            WizardStep.details,
            WizardStep.place,
            WizardStep.review,
          ]
        : const [
            WizardStep.details,
            WizardStep.attributes,
            WizardStep.hidden,
            WizardStep.review,
          ];
    if (editing) {
      draft = ListingDraft.fromItem(widget.item!);
      index = steps.indexOf(WizardStep.details);
    } else {
      draft = ListingDraft(type: widget.type);
      _prefillPhone();
      final saved = ref
          .read(jsonCacheProvider)
          .get<Map<String, dynamic>>(draftKey);
      if (saved != null) {
        final restored = ListingDraft.fromJson(widget.type, saved);
        if (restored.hasContent) {
          restorePending = true;
          WidgetsBinding.instance.addPostFrameCallback(
            (_) => _askRestore(restored),
          );
        }
      }
    }
  }

  Future<void> _askRestore(ListingDraft restored) async {
    final l = context.l10n;
    final keep = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(l.draftRestore),
        content: Text(l.draftRestoreBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: Text(l.startOver),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(c, true),
            child: Text(l.continueDraft),
          ),
        ],
      ),
    );
    if (!mounted) return;
    setState(() {
      restorePending = false;
      if (keep == true) {
        draft = restored;
        _prefillPhone();
        index = steps.indexOf(WizardStep.details);
      } else {
        ref.read(jsonCacheProvider).remove(draftKey);
      }
    });
  }

  @override
  void dispose() {
    saveTimer?.cancel();
    super.dispose();
  }

  void changed() {
    setState(() {});
    if (editing) return;
    saveTimer?.cancel();
    saveTimer = Timer(
      const Duration(milliseconds: 400),
      () => ref.read(jsonCacheProvider).put(draftKey, draft.toJson()),
    );
  }

  Category? get category => ref
      .read(categoriesProvider)
      .value
      ?.where((c) => c.id == draft.categoryId)
      .firstOrNull;

  bool validate(WizardStep step) {
    final l = context.l10n;
    switch (step) {
      case WizardStep.details:
        if (draft.categoryId == null) {
          showSnack(context, l.categoryRequired, error: true);
          return false;
        }
        if (draft.title.trim().length < 3) {
          showSnack(context, l.titleRequired, error: true);
          return false;
        }
        return true;
      case WizardStep.place:
      case WizardStep.attributes:
        if (draft.locationId == null) {
          showSnack(context, l.locationRequired, error: true);
          return false;
        }
        if (!draft.phoneLooksValid) {
          showSnack(context, l.phoneRequired, error: true);
          return false;
        }
        return true;
      case WizardStep.review:
        return true;
      default:
        return true;
    }
  }

  void next() {
    if (!validate(steps[index])) return;
    // After the photo the AI usually has filled the item itself: go straight to
    // place and phone. Without a confident result the details step shows as usual.
    if (steps[index] == WizardStep.photo &&
        draft.detailsReady &&
        steps.contains(WizardStep.place)) {
      setState(() {
        skippedDetails = true;
        index = steps.indexOf(WizardStep.place);
      });
      return;
    }
    if (index < steps.length - 1) setState(() => index++);
  }

  void editDetails() => setState(() {
    skippedDetails = false;
    index = steps.indexOf(WizardStep.details);
  });

  void back() {
    if (skippedDetails && steps[index] == WizardStep.place) {
      setState(() => index = steps.indexOf(WizardStep.photo));
    } else if (index > 0) {
      setState(() => index--);
    } else {
      goBack(context);
    }
  }

  Future<void> submit() async {
    if (busy) return;
    // Pressing "Publish" under the rules notice is the acceptance (PRD §10 step 9).
    draft.acceptRules = true;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final body = draft.toBody(category: category);
      await ref
          .read(jsonCacheProvider)
          .put(_phoneKey, draft.contactPhone.trim());
      final repo = ref.read(itemsRepositoryProvider);
      if (editing) {
        await repo.update(widget.item!.id, body);
        if (mounted) Navigator.pop(context, true);
      } else {
        final result = await repo.create({
          ...body,
          'listingType': widget.type,
          'acceptRules': true,
          'aiAssisted': draft.aiAssisted,
        }, idempotencyKey: draft.idempotencyKey);
        saveTimer?.cancel();
        await ref.read(jsonCacheProvider).remove(draftKey);
        ref.invalidate(recentItemsProvider);
        ref.invalidate(nearbyItemsProvider);
        if (mounted) {
          context.go(
            '/new/success?item=${result.item.id}&type=${widget.type}&status=${result.item.status}&matches=${result.matchesCount}',
          );
        }
      }
    } catch (e) {
      if (mounted) setState(() => error = errorText(context, e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  String stepTitle(WizardStep s) {
    final l = context.l10n;
    return switch (s) {
      WizardStep.photo => l.photoStepTitle,
      WizardStep.details => draft.isLost ? l.lostFlowTitle : l.detailsStepTitle,
      WizardStep.place => l.whereWhenTitle,
      WizardStep.attributes => l.lostAttributesTitle,
      WizardStep.hidden => l.hiddenStepTitle,
      WizardStep.review => l.reviewStepTitle,
    };
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context);
    final step = steps[index];
    final isLast = index == steps.length - 1;
    return PopScope(
      canPop: index == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) back();
      },
      child: Scaffold(
        body: SoftBackground(
          child: SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    Space.s,
                    Space.s,
                    Space.l,
                    0,
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        tooltip: l.close,
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => goBack(context),
                      ),
                      Expanded(
                        child: Text(
                          editing
                              ? l.edit
                              : (draft.isLost
                                    ? l.lostFlowTitle
                                    : l.foundFlowTitle),
                          style: t.textTheme.titleMedium,
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(width: 48),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    Space.xl,
                    Space.s,
                    Space.xl,
                    0,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: TweenAnimationBuilder<double>(
                          tween: Tween(end: (index + 1) / steps.length),
                          duration: Motion.screen,
                          curve: Motion.spring,
                          builder: (_, v, _) =>
                              LinearProgressIndicator(value: v, minHeight: 6),
                        ),
                      ),
                      const SizedBox(height: Space.m),
                      Text(
                        l.stepOf(index + 1, steps.length),
                        style: t.textTheme.labelSmall,
                      ),
                      const SizedBox(height: 2),
                      Text(stepTitle(step), style: t.textTheme.headlineMedium),
                    ],
                  ),
                ),
                Expanded(
                  child: AnimatedSwitcher(
                    duration: Motion.screen,
                    switchInCurve: Motion.spring,
                    transitionBuilder: (child, anim) => FadeTransition(
                      opacity: anim,
                      child: SlideTransition(
                        position: Tween(
                          begin: const Offset(0.04, 0),
                          end: Offset.zero,
                        ).animate(anim),
                        child: child,
                      ),
                    ),
                    child: restorePending
                        ? const SizedBox.shrink()
                        : KeyedSubtree(
                            key: ValueKey(step),
                            child: switch (step) {
                              WizardStep.photo => PhotoStep(
                                draft: draft,
                                onChanged: changed,
                                prominent: true,
                              ),
                              WizardStep.details => DetailsStep(
                                draft: draft,
                                onChanged: changed,
                                formKey: detailsForm,
                              ),
                              WizardStep.place => PlaceStep(
                                draft: draft,
                                onChanged: changed,
                                withHidden: true,
                              ),
                              WizardStep.attributes => PlaceStep(
                                draft: draft,
                                onChanged: changed,
                                withAttributes: true,
                              ),
                              WizardStep.hidden => HiddenStep(
                                draft: draft,
                                onChanged: changed,
                              ),
                              WizardStep.review => ReviewStep(
                                draft: draft,
                                onChanged: changed,
                                error: error,
                                editing: editing,
                                onEditDetails:
                                    steps.contains(WizardStep.details)
                                    ? editDetails
                                    : null,
                              ),
                            },
                          ),
                  ),
                ),
                GlassActionBar(
                  child: Row(
                    children: [
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(56, 52),
                          padding: const EdgeInsets.symmetric(horizontal: 18),
                        ),
                        onPressed: busy ? null : back,
                        child: Icon(
                          index == 0
                              ? Icons.close_rounded
                              : Icons.arrow_back_rounded,
                        ),
                      ),
                      const SizedBox(width: Space.m),
                      Expanded(
                        child: isLast
                            ? BusyButton(
                                label: editing ? l.save : l.publish,
                                busy: busy,
                                icon: editing
                                    ? Icons.check_rounded
                                    : Icons.rocket_launch_rounded,
                                onPressed: submit,
                              )
                            : FilledButton.icon(
                                onPressed: busy ? null : next,
                                icon: const Icon(Icons.arrow_forward_rounded),
                                label: Text(
                                  step == WizardStep.photo &&
                                          draft.media == null
                                      ? l.continueWithoutPhoto
                                      : l.next,
                                ),
                              ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
