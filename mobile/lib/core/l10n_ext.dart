import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';

import 'models.dart';

export '../l10n/app_localizations.dart';

extension L10nX on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
  String get localeCode => switch (Localizations.localeOf(this).languageCode) {
    'ky' => 'ky',
    'en' => 'en',
    _ => 'ru',
  };
}

/// Human labels for server enums — the server sends codes, the app renders text (PRD §27).
class Labels {
  static String itemStatus(AppLocalizations l, String status) =>
      switch (status) {
        'PUBLISHED' => l.statusPublished,
        'PENDING_REVIEW' => l.statusPendingReview,
        'RESOLVED' => l.statusResolved,
        'CLOSED' => l.statusClosed,
        'REMOVED' => l.statusRemoved,
        'DRAFT' => l.statusDraft,
        _ => status,
      };

  static String claimStatus(AppLocalizations l, String status) =>
      switch (status) {
        'SUBMITTED' => l.claimStatusSubmitted,
        'SCREENING' => l.claimStatusScreening,
        'NEEDS_MORE_INFORMATION' => l.claimStatusNeedsInfo,
        'UNDER_REVIEW' => l.claimStatusUnderReview,
        'PLAUSIBLE' => l.claimStatusPlausible,
        'REJECTED' => l.claimStatusRejected,
        'WITHDRAWN' => l.claimStatusWithdrawn,
        'APPROVED_FOR_HANDOFF' => l.claimStatusApprovedHandoff,
        'COMPLETED' => l.claimStatusCompleted,
        _ => status,
      };

  static String color(AppLocalizations l, String? key) => switch (key) {
    'black' => l.colorBlack,
    'white' => l.colorWhite,
    'gray' => l.colorGray,
    'red' => l.colorRed,
    'orange' => l.colorOrange,
    'yellow' => l.colorYellow,
    'green' => l.colorGreen,
    'blue' => l.colorBlue,
    'purple' => l.colorPurple,
    'pink' => l.colorPink,
    'brown' => l.colorBrown,
    'beige' => l.colorBeige,
    'gold' => l.colorGold,
    'silver' => l.colorSilver,
    'multicolor' => l.colorMulticolor,
    _ => key ?? '',
  };

  static const colorKeys = [
    'black',
    'white',
    'gray',
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'pink',
    'brown',
    'beige',
    'gold',
    'silver',
    'multicolor',
  ];

  static Color swatch(String key) => switch (key) {
    'black' => const Color(0xFF1B1B1F),
    'white' => const Color(0xFFF5F5F5),
    'gray' => const Color(0xFF8E97A6),
    'red' => const Color(0xFFD94B59),
    'orange' => const Color(0xFFF08A24),
    'yellow' => const Color(0xFFF2C94C),
    'green' => const Color(0xFF2EAE6C),
    'blue' => const Color(0xFF2378F7),
    'purple' => const Color(0xFF8E5BE5),
    'pink' => const Color(0xFFEF7DA8),
    'brown' => const Color(0xFF8B5A2B),
    'beige' => const Color(0xFFD9C4A3),
    'gold' => const Color(0xFFD4AF37),
    'silver' => const Color(0xFFBFC5CE),
    _ => const Color(0xFF9DB2D6),
  };

  static String trust(AppLocalizations l, String level) => switch (level) {
    'EstablishedAccount' => l.trustEstablished,
    'ContactVerified' => l.trustContactVerified,
    _ => l.trustGuest,
  };

  static String evidenceType(AppLocalizations l, String t) => switch (t) {
    'unique_feature' => l.evidenceUniqueFeature,
    'contents' => l.evidenceContents,
    'purchase_proof' => l.evidencePurchase,
    'old_photo' => l.evidenceOldPhoto,
    _ => l.evidenceOther,
  };

  static String warning(AppLocalizations l, String w) => switch (w) {
    'advance_payment' => l.warningAdvancePayment,
    'otp_request' => l.warningOtp,
    'suspicious_link' => l.warningLink,
    _ => w,
  };

  static String? sensitiveHint(AppLocalizations l, Category c) =>
      switch (c.slug) {
        'documents' => l.sensitiveDocuments,
        'bank_cards' => l.sensitiveBankCards,
        'keys' => l.sensitiveKeys,
        'phones' => l.sensitivePhones,
        _ => null,
      };

  static String relativeTime(AppLocalizations l, DateTime t) {
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 1) return l.justNow;
    if (d.inHours < 1) return l.minutesAgo(d.inMinutes);
    if (d.inDays < 1) return l.hoursAgo(d.inHours);
    return l.daysAgo(d.inDays);
  }

  static IconData categoryIcon(String icon) => switch (icon) {
    'wallet' => Icons.account_balance_wallet_outlined,
    'id-card' => Icons.badge_outlined,
    'credit-card' => Icons.credit_card,
    'smartphone' => Icons.smartphone,
    'headphones' => Icons.headphones_outlined,
    'key' => Icons.vpn_key_outlined,
    'backpack' => Icons.backpack_outlined,
    'gem' => Icons.diamond_outlined,
    'shirt' => Icons.checkroom,
    'glasses' => Icons.visibility_outlined,
    'paw' => Icons.pets,
    'teddy-bear' => Icons.toys_outlined,
    'bike' => Icons.pedal_bike,
    _ => Icons.sell_outlined,
  };
}
