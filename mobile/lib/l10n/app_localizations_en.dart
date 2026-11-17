// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Tabyldy';

  @override
  String get tagline => 'Found it — post it. Lost it — find it.';

  @override
  String get onboarding1Title => 'What\'s lost can be found';

  @override
  String get onboarding1Body =>
      'One place where people who lost something meet people who found it.';

  @override
  String get onboarding2Title => 'Found something? Help return it';

  @override
  String get onboarding2Body =>
      'Take a photo of the find — your listing is ready in a minute.';

  @override
  String get onboarding3Title => 'Talk safely';

  @override
  String get onboarding3Body =>
      'A protected chat and owner verification keep scammers away.';

  @override
  String get continueLabel => 'Continue';

  @override
  String get skip => 'Skip';

  @override
  String get chooseLanguage => 'Choose language';

  @override
  String get languageSheetTitle => 'App language';

  @override
  String get russian => 'Русский';

  @override
  String get kyrgyz => 'Кыргызча';

  @override
  String get getStarted => 'Get started';

  @override
  String get navHome => 'Home';

  @override
  String get navLost => 'Lost';

  @override
  String get navCamera => 'I found';

  @override
  String get navFound => 'Found';

  @override
  String get navProfile => 'Profile';

  @override
  String get homeGreeting => 'Hello!';

  @override
  String homeGreetingName(String name) {
    return 'Hello, $name!';
  }

  @override
  String get homeGreetingGuest => 'Welcome';

  @override
  String get homeSubtitle => 'We help bring lost things back';

  @override
  String get searchHint => 'What are you looking for? E.g. a wallet';

  @override
  String get iLost => 'I lost';

  @override
  String get iFound => 'I found';

  @override
  String get homeHeroLostBody => 'Describe it — we\'ll find similar ones';

  @override
  String get homeHeroFoundBody => 'Snap a photo — AI fills in the rest';

  @override
  String get recentItems => 'Recently posted';

  @override
  String get nearby => 'New finds nearby';

  @override
  String nearbyIn(String city) {
    return 'Finds: $city';
  }

  @override
  String get chooseCity => 'Choose a city';

  @override
  String get allCities => 'All of Kyrgyzstan';

  @override
  String get nothingNearby => 'No new finds in this city yet';

  @override
  String get categories => 'Categories';

  @override
  String get messages => 'Messages';

  @override
  String get safetyTipsTitle => 'Safe return';

  @override
  String get safetyTip1 => 'Never send money in advance.';

  @override
  String get safetyTip2 => 'Never share confirmation codes.';

  @override
  String get safetyTip3 => 'Meet in busy public places.';

  @override
  String get seeAll => 'All';

  @override
  String get lostCatalogTitle => 'Lost items';

  @override
  String get foundCatalogTitle => 'Found items';

  @override
  String get filters => 'Filters';

  @override
  String get sortLabel => 'Sort';

  @override
  String get sortNewest => 'Newest first';

  @override
  String get sortRelevance => 'Most relevant';

  @override
  String get apply => 'Apply';

  @override
  String get reset => 'Reset';

  @override
  String get category => 'Category';

  @override
  String get allCategories => 'All categories';

  @override
  String get color => 'Color';

  @override
  String get district => 'District';

  @override
  String get city => 'City';

  @override
  String get anyOption => 'Any';

  @override
  String get withReward => 'With a reward';

  @override
  String get details => 'Details';

  @override
  String get maybeIFoundIt => 'I may have found this';

  @override
  String get thisIsMine => 'This is mine';

  @override
  String get emptySearch => 'Nothing found for your search yet';

  @override
  String get changeFilters => 'Change filters';

  @override
  String get createListing => 'Create a listing';

  @override
  String get recentSearches => 'Recent searches';

  @override
  String get clearRecent => 'Clear';

  @override
  String get suggestions => 'Suggestions';

  @override
  String resultsCount(int n) {
    return '$n listings';
  }

  @override
  String get endOfList => 'That\'s all the listings';

  @override
  String get retry => 'Retry';

  @override
  String get errorGeneric => 'Something went wrong';

  @override
  String get offlineBanner => 'No connection. Showing saved data.';

  @override
  String get loading => 'Loading…';

  @override
  String get contentRemoved => 'This listing was removed by moderators';

  @override
  String get itemUnavailable => 'This listing is unavailable';

  @override
  String get accessDenied => 'No access';

  @override
  String get statusPublished => 'Published';

  @override
  String get statusPendingReview => 'Under review';

  @override
  String get statusResolved => 'Returned';

  @override
  String get statusClosed => 'Closed';

  @override
  String get statusRemoved => 'Removed';

  @override
  String get statusDraft => 'Draft';

  @override
  String get statusHintPending =>
      'A moderator is checking this listing. For now only you can see it.';

  @override
  String get lostLabel => 'Lost';

  @override
  String get foundLabel => 'Found';

  @override
  String get reward => 'Reward';

  @override
  String rewardAmount(String amount) {
    return '$amount som';
  }

  @override
  String get description => 'Description';

  @override
  String get visibleFeatures => 'Visible features';

  @override
  String get brand => 'Brand';

  @override
  String get size => 'Size';

  @override
  String get date => 'Date';

  @override
  String get approximateArea => 'Approximate area';

  @override
  String get postedBy => 'Posted by';

  @override
  String get contactHidden =>
      'Contacts are hidden. Messaging opens once a claim is confirmed.';

  @override
  String get trustGuest => 'Guest';

  @override
  String get trustContactVerified => 'Contact verified';

  @override
  String get trustEstablished => 'Trusted member';

  @override
  String get report => 'Report';

  @override
  String get share => 'Share';

  @override
  String get linkCopied => 'Link copied';

  @override
  String get edit => 'Edit';

  @override
  String get moreActions => 'More';

  @override
  String get ownerPanelTitle => 'Manage listing';

  @override
  String get viewMatches => 'Matches';

  @override
  String get viewClaims => 'Claims';

  @override
  String pendingClaimsCount(int n) {
    return '$n new';
  }

  @override
  String get markResolved => 'Item returned';

  @override
  String get closeListing => 'Close listing';

  @override
  String get matchesTitle => 'We may have found similar items';

  @override
  String get matchesEmpty =>
      'No matches yet. We\'ll let you know when they appear.';

  @override
  String get matchWhy => 'Why we suggest this';

  @override
  String get matchDisclaimer =>
      'A match does not prove ownership. Check the hidden features through a claim.';

  @override
  String get check => 'Check';

  @override
  String get dismiss => 'Hide';

  @override
  String get noPhotoRestricted =>
      'Photos are not published for this category, for safety.';

  @override
  String get foundFlowTitle => 'New find';

  @override
  String get lostFlowTitle => 'What did you lose?';

  @override
  String stepOf(int n, int total) {
    return 'Step $n of $total';
  }

  @override
  String get back => 'Back';

  @override
  String get next => 'Next';

  @override
  String get stepPhoto => 'Photo';

  @override
  String get stepDetails => 'Details';

  @override
  String get stepPlace => 'Where and when';

  @override
  String get stepHidden => 'Hidden features';

  @override
  String get stepReview => 'Review';

  @override
  String get photoStepTitle => 'Take a photo of the find';

  @override
  String get photoStepBody =>
      'Photograph the whole item on a plain background. Close-ups of documents, cards and keys are not published.';

  @override
  String get takePhoto => 'Take a photo';

  @override
  String get pickFromGallery => 'Choose from gallery';

  @override
  String get retakePhoto => 'Retake';

  @override
  String get removePhoto => 'Remove photo';

  @override
  String get photoTaken => 'Photo added';

  @override
  String get noPhotoHint => 'A photo is optional';

  @override
  String get cameraPermissionTitle => 'Camera access needed';

  @override
  String get cameraPermissionBody =>
      'The camera is only used to photograph the item you found. You can also pick a photo from the gallery.';

  @override
  String get continueWithoutPhoto => 'Continue without a photo';

  @override
  String get photoProcessing => 'Processing the photo…';

  @override
  String get photoBlocked =>
      'The photo contains private data and cannot be published.';

  @override
  String get photoUnchecked =>
      'A moderator will check the photo, then the listing will appear in the feed — usually within a few hours.';

  @override
  String get aiSuggestionsTitle => 'AI suggestions';

  @override
  String get aiSuggestionsOff => 'Suggestions are off';

  @override
  String get aiSuggestionsApplied =>
      'Suggestions applied — check them and fix if needed';

  @override
  String get aiNotSure => 'Category, color and title — from the photo';

  @override
  String get useSuggestion => 'Apply';

  @override
  String get detailsStepTitle => 'Describe the item';

  @override
  String get whereWhenTitle => 'Where and when';

  @override
  String get lostAttributesTitle => 'What it looks like';

  @override
  String get hiddenStepTitle => 'Hidden features';

  @override
  String get reviewStepTitle => 'Check your listing';

  @override
  String get titleField => 'Title';

  @override
  String get titleHintFound => 'E.g. Found a black wallet';

  @override
  String get titleHintLost => 'E.g. Lost a blue backpack';

  @override
  String get titleRequired => 'Enter a title of at least 3 characters';

  @override
  String get categoryRequired => 'Choose a category';

  @override
  String get descriptionField => 'Description (visible details only)';

  @override
  String get colorField => 'Color';

  @override
  String get brandField => 'Brand (if known)';

  @override
  String get sizeField => 'Size (if relevant)';

  @override
  String get areaField => 'Approximate area';

  @override
  String get chooseArea => 'Choose an area';

  @override
  String get dateField => 'When';

  @override
  String get dateRangeApprox => 'The date can be approximate';

  @override
  String get today => 'Today';

  @override
  String get yesterday => 'Yesterday';

  @override
  String get hiddenFeaturesTitle => 'Hidden features';

  @override
  String get hiddenFeaturesHelp =>
      'Details only the owner knows: an engraving, the contents, a scratch. They are not shown in the listing and are used to check claims.';

  @override
  String get hiddenFeatureHint => 'E.g. a scratch on the zipper';

  @override
  String get addFeature => 'Add a feature';

  @override
  String get rewardField => 'Reward (optional)';

  @override
  String get rewardNote => 'Note about the reward';

  @override
  String get rewardDisclaimer => 'The platform never holds or transfers money.';

  @override
  String get notifyMatches => 'Tell me about similar finds';

  @override
  String get acceptRules =>
      'I accept the posting rules and do not publish other people\'s personal data';

  @override
  String get preview => 'This is how others will see your listing';

  @override
  String get publish => 'Publish';

  @override
  String get publishing => 'Publishing…';

  @override
  String get successFoundTitle =>
      'Thank you! You\'re helping return a lost item';

  @override
  String get successLostTitle => 'Listing published';

  @override
  String get successPendingReview =>
      'Your listing was sent for review. This usually takes up to a few hours.';

  @override
  String get viewListing => 'View listing';

  @override
  String get toHome => 'Go home';

  @override
  String get draftSaved => 'Draft saved';

  @override
  String get draftRestore => 'Continue your draft?';

  @override
  String get draftRestoreBody =>
      'You have an unfinished listing. The main fields were saved.';

  @override
  String get continueDraft => 'Continue';

  @override
  String get startOver => 'Start over';

  @override
  String matchesFoundCount(int count) {
    return '$count similar finds';
  }

  @override
  String get sensitiveCategoryTitle => 'Special category';

  @override
  String get sensitiveDocuments =>
      'Documents: don\'t publish numbers or photos. Describe the type of document and leave out the name on it — the owner will confirm it.';

  @override
  String get sensitiveBankCards =>
      'Bank cards: don\'t photograph the card or write its number. We recommend handing the card to the bank.';

  @override
  String get sensitiveKeys =>
      'Keys: don\'t publish photos of the key profile or mention an address.';

  @override
  String get sensitivePhones =>
      'Phones: don\'t publish the IMEI and don\'t try to unlock the device.';

  @override
  String get authTitle => 'Sign in or create an account';

  @override
  String get authBody =>
      'This is optional. Confirm your phone or email to keep your listings and chats and open them on any device.';

  @override
  String get phone => 'Phone';

  @override
  String get email => 'Email';

  @override
  String get phoneHint => '+996 700 000 000';

  @override
  String get emailHint => 'name@example.com';

  @override
  String get sendCode => 'Get a code';

  @override
  String get codeSentTo => 'Code sent. Enter the 6 digits.';

  @override
  String get codeField => 'Code';

  @override
  String get verify => 'Confirm';

  @override
  String get resendCode => 'Send again';

  @override
  String devCodeHint(String code) {
    return 'Development code: $code';
  }

  @override
  String get claimTitle => 'Owner check';

  @override
  String get claimIntro =>
      'To protect the item from scammers, we need to make sure it really belongs to you.';

  @override
  String get claimFoundReportIntro =>
      'Tell us what you found and where. The owner will compare it with their hidden features.';

  @override
  String get claimMessage => 'Message (no personal data)';

  @override
  String get evidenceType => 'Type of proof';

  @override
  String get evidenceUniqueFeature => 'Unique feature';

  @override
  String get evidenceContents => 'Contents';

  @override
  String get evidencePurchase => 'Proof of purchase';

  @override
  String get evidenceOldPhoto => 'Old photo';

  @override
  String get evidenceOther => 'Other';

  @override
  String get evidenceText => 'Description';

  @override
  String get addEvidence => 'Add proof';

  @override
  String get evidenceHint =>
      'Describe something that isn\'t visible in the photo';

  @override
  String get submitClaim => 'Send claim';

  @override
  String get claimSubmitted => 'Claim sent. We\'ll let you know the decision.';

  @override
  String get myClaims => 'My claims';

  @override
  String get incomingClaims => 'Claims on my items';

  @override
  String get claimsEmptyMine => 'You haven\'t sent any claims yet';

  @override
  String get claimsEmptyIncoming => 'No claims on your items yet';

  @override
  String get claimStatusLabel => 'Claim status';

  @override
  String get claimStatusSubmitted => 'Sent';

  @override
  String get claimStatusScreening => 'Being checked';

  @override
  String get claimStatusNeedsInfo => 'More details needed';

  @override
  String get claimStatusUnderReview => 'Under moderator review';

  @override
  String get claimStatusPlausible => 'Confirmed, you can talk';

  @override
  String get claimStatusRejected => 'Rejected';

  @override
  String get claimStatusWithdrawn => 'Withdrawn';

  @override
  String get claimStatusApprovedHandoff => 'Ready for handover';

  @override
  String get claimStatusCompleted => 'Return completed';

  @override
  String get decisionTitle => 'Your decision';

  @override
  String get decisionPlausible => 'Looks genuine';

  @override
  String get decisionNeedsInfo => 'Ask for details';

  @override
  String get decisionReject => 'Reject';

  @override
  String get decisionNote => 'Comment (optional)';

  @override
  String get withdrawClaim => 'Withdraw claim';

  @override
  String get openChat => 'Open chat';

  @override
  String get yourHiddenFeatures => 'Your hidden features to compare';

  @override
  String get evidenceFromClaimant => 'Proof from the claimant';

  @override
  String get dispute => 'Dispute';

  @override
  String get claimantLabel => 'Claimant';

  @override
  String get chatsTitle => 'Messages';

  @override
  String get chatsEmpty =>
      'No chats yet. A chat opens once a claim is confirmed.';

  @override
  String get messageHint => 'Message…';

  @override
  String get send => 'Send';

  @override
  String get attachPhoto => 'Attach a photo';

  @override
  String get systemMessage => 'System';

  @override
  String get connectionLive => 'online';

  @override
  String get connectionReconnecting => 'reconnecting…';

  @override
  String get chatClosedBanner => 'Chat ended';

  @override
  String get warningAdvancePayment =>
      'The other person mentions prepayment. Don\'t send money before you get the item.';

  @override
  String get warningOtp => 'Never share confirmation codes with anyone.';

  @override
  String get warningLink => 'Be careful with external links.';

  @override
  String get blockUser => 'Block';

  @override
  String get closeChat => 'End chat';

  @override
  String get handoffActions => 'Return';

  @override
  String get handoffTitle => 'Handing over the item';

  @override
  String get handoffPropose => 'Arrange the handover';

  @override
  String get handoffMethodMeeting => 'Meet in person';

  @override
  String get handoffMethodOther => 'Another way';

  @override
  String get handoffPlaceHint => 'Where will you meet? Choose a busy place';

  @override
  String get handoffCreate => 'Propose';

  @override
  String get handoffStep1 => 'Proposal';

  @override
  String get handoffStep2 => 'Your confirmation';

  @override
  String get handoffStep3 => 'The other side\'s confirmation';

  @override
  String get handoffStep4 => 'Completed';

  @override
  String get handoffCodeTitle => 'Confirmation code';

  @override
  String get handoffCodeHolder =>
      'Tell this code to the receiver at the handover. It is valid for 72 hours.';

  @override
  String get handoffCodeReceiver => 'Enter the code the finder tells you';

  @override
  String handoffCodeExpires(String time) {
    return 'Valid until $time';
  }

  @override
  String get handoffConfirm => 'Confirm handover';

  @override
  String get handoffWaiting => 'Waiting for the other side to confirm';

  @override
  String get handoffCompleted => 'Both sides confirmed the return. Thank you!';

  @override
  String get handoffDisclaimer =>
      'The code confirms the action in the app, but on its own it does not prove ownership or the physical handover.';

  @override
  String get profileTitle => 'Profile';

  @override
  String get guestProfileBody =>
      'No sign-up needed: you can photograph and post finds right away. Sign in when you want to keep your listings and chats on other devices.';

  @override
  String get sectionMine => 'Mine';

  @override
  String get sectionSettings => 'Settings';

  @override
  String get sectionSafety => 'Safety and help';

  @override
  String get myListings => 'My listings';

  @override
  String get myMessages => 'My messages';

  @override
  String get returnsHistory => 'Return history';

  @override
  String get returnsEmpty => 'No completed returns yet';

  @override
  String activeListings(int n) {
    return '$n active listings';
  }

  @override
  String get notifications => 'Notifications';

  @override
  String get language => 'Language';

  @override
  String get appearance => 'Appearance';

  @override
  String get themeSystem => 'System default';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get privacy => 'Privacy';

  @override
  String get security => 'Security';

  @override
  String get sessions => 'Active sessions';

  @override
  String get revokeAll => 'Sign out on all devices';

  @override
  String get help => 'Help';

  @override
  String get helpQ1 => 'How do I prove the item is mine?';

  @override
  String get helpA1 =>
      'Send a claim and describe something that isn\'t visible in the photo: an engraving, the contents, a defect. The finder will compare it with the hidden features.';

  @override
  String get helpQ2 => 'Why doesn\'t the chat open right away?';

  @override
  String get helpA2 =>
      'The chat appears only after the listing author finds the claim genuine. This protects against scammers.';

  @override
  String get helpQ3 => 'Does the platform charge for returns?';

  @override
  String get helpA3 =>
      'No. A reward is a personal agreement between the two sides. The app never holds or transfers money.';

  @override
  String get helpQ4 => 'What should I do with found documents or cards?';

  @override
  String get helpA4 =>
      'Don\'t publish photos or numbers. Describe the type of document and hand it to the bank or an official organization.';

  @override
  String get aboutApp => 'About the app';

  @override
  String versionLabel(String v) {
    return 'Version $v';
  }

  @override
  String get deleteAccount => 'Delete account';

  @override
  String get deleteAccountConfirm =>
      'Your account will be anonymized, contacts and sessions deleted, and listings closed. This cannot be undone.';

  @override
  String get logout => 'Sign out';

  @override
  String get publicName => 'Name in the app';

  @override
  String get save => 'Save';

  @override
  String get cancel => 'Cancel';

  @override
  String get delete => 'Delete';

  @override
  String get close => 'Close';

  @override
  String get done => 'Done';

  @override
  String get optional => 'optional';

  @override
  String get notifMatches => 'Similar finds';

  @override
  String get notifMessages => 'Messages';

  @override
  String get privacyBody =>
      'We show only an approximate area, strip photo metadata, hide contacts and keep hidden features separately. Chats are protected on the server; there is no end-to-end encryption.';

  @override
  String get notificationsEmpty => 'No notifications yet';

  @override
  String get markAllRead => 'Mark all as read';

  @override
  String get reportTitle => 'Report';

  @override
  String get reportReasonFraud => 'Fraud';

  @override
  String get reportReasonSpam => 'Spam';

  @override
  String get reportReasonInappropriate => 'Inappropriate content';

  @override
  String get reportReasonPersonalData => 'Personal data';

  @override
  String get reportReasonWrongCategory => 'Wrong category';

  @override
  String get reportReasonHarassment => 'Harassment';

  @override
  String get reportReasonOther => 'Other';

  @override
  String get reportDetails => 'Details (optional)';

  @override
  String get reportSent => 'Report sent. Thank you!';

  @override
  String get colorBlack => 'Black';

  @override
  String get colorWhite => 'White';

  @override
  String get colorGray => 'Gray';

  @override
  String get colorRed => 'Red';

  @override
  String get colorOrange => 'Orange';

  @override
  String get colorYellow => 'Yellow';

  @override
  String get colorGreen => 'Green';

  @override
  String get colorBlue => 'Blue';

  @override
  String get colorPurple => 'Purple';

  @override
  String get colorPink => 'Pink';

  @override
  String get colorBrown => 'Brown';

  @override
  String get colorBeige => 'Beige';

  @override
  String get colorGold => 'Gold';

  @override
  String get colorSilver => 'Silver';

  @override
  String get colorMulticolor => 'Multicolor';

  @override
  String get justNow => 'just now';

  @override
  String minutesAgo(int n) {
    return '$n min ago';
  }

  @override
  String hoursAgo(int n) {
    return '$n h ago';
  }

  @override
  String daysAgo(int n) {
    return '$n d ago';
  }

  @override
  String get aiAnalyzing => 'Recognizing the item in the photo…';

  @override
  String get aiAnalyzingBody =>
      'AI will detect the category, color, brand and model';

  @override
  String aiFilled(String fields) {
    return 'AI filled in: $fields. Check and fix if needed';
  }

  @override
  String get aiTitle => 'title';

  @override
  String get aiPhotoHint =>
      'The photo is blurry or dark — retake it in good light so AI can fill in more fields';

  @override
  String get phoneForListing => 'Your phone';

  @override
  String get phoneListingNote =>
      'The number is hidden in the listing. Only the person whose claim you approve will see it.';

  @override
  String get phoneRequired => 'Enter your phone number';

  @override
  String get locationRequired =>
      'Choose the area where the item was found or lost';

  @override
  String get editDetails => 'Edit details';

  @override
  String aiRecognized(String item) {
    return 'AI recognized: $item';
  }

  @override
  String get contactPhoneTitle => 'Contact phone';

  @override
  String get copyPhone => 'Copy number';

  @override
  String get phoneCopied => 'Number copied';

  @override
  String get aiResultTitle => 'AI recognized';

  @override
  String get aiResultHint => 'Tap a field to fix it';

  @override
  String get aiResultUnsure =>
      'Couldn\'t recognize the item confidently — choose a category on the next step';

  @override
  String aiMaybe(String category) {
    return 'Maybe: $category';
  }

  @override
  String get aiFromText => 'Picked from your description';

  @override
  String get chooseCategory => 'Choose a category';

  @override
  String get chooseColor => 'Choose a color';

  @override
  String get notSet => 'not set';

  @override
  String get publishConsent =>
      'By tapping \"Publish\" you accept the posting rules and confirm that you are not publishing other people\'s personal data.';

  @override
  String get homeEmptyRecent => 'Nothing here yet — post the first find';

  @override
  String get locateButton => 'Use my location';

  @override
  String locateDone(String area) {
    return 'Area detected: $area. You can change it below.';
  }

  @override
  String get locateDenied => 'No location access — choose the area manually.';

  @override
  String get locateNotFound => 'No known areas nearby — choose manually.';

  @override
  String get locateFailed =>
      'Couldn\'t get your location — choose the area manually.';

  @override
  String get scamTitle => 'How scams work and how to stay safe';

  @override
  String get scam1t => '\"I found your item, pay for the delivery\"';

  @override
  String get scam1d =>
      'A real finder never asks for money in advance. Ask them to name a hidden feature and meet in person.';

  @override
  String get scam2t => '\"It\'s mine\", but they can\'t name any features';

  @override
  String get scam2d =>
      'The real owner can name something that isn\'t in the listing. Don\'t hand the item over without checking.';

  @override
  String get scam3t => '\"Tell me the code from the SMS\"';

  @override
  String get scam3d =>
      'That\'s how money and accounts get stolen. Returning an item never needs codes, PINs or card details.';

  @override
  String get scam4t => '\"I\'m from Tabyldy staff\"';

  @override
  String get scam4d =>
      'Tabyldy never calls and never asks for money or data. Don\'t trust such calls.';

  @override
  String get scam5t => '\"I\'ll return it only for money\"';

  @override
  String get scam5d =>
      'Don\'t agree, and report the listing. If you are threatened, call 102.';

  @override
  String get scamHelp =>
      'If you were scammed: report the listing or the person, keep the chat and contact the police (102).';

  @override
  String get english => 'English';

  @override
  String get commentsTitle => 'Comments';

  @override
  String commentsCount(int n) {
    return 'Comments · $n';
  }

  @override
  String get commentsEmpty =>
      'No comments yet. Seen this item or know where it is? Write here.';

  @override
  String get commentHint => 'Write a comment…';

  @override
  String get commentRules =>
      'Everyone can see comments. Don\'t post phone numbers, addresses or the item\'s hidden features — use a claim to get in touch.';

  @override
  String get commentByOwner => 'Listing author';

  @override
  String get commentDelete => 'Delete comment';

  @override
  String get commentDeleted => 'Comment deleted';

  @override
  String get commentsClosed => 'This listing is closed to new comments.';

  @override
  String get notifComments => 'Comments on my listings';

  @override
  String get contactUs => 'Contact us';

  @override
  String get contactUsSubtitle => 'Ideas, problems and feedback about the app';

  @override
  String get feedbackIntro =>
      'Tell us what to improve, what doesn\'t work or what you liked. The team reads every message.';

  @override
  String get feedbackKind => 'Topic';

  @override
  String get feedbackIdea => 'Idea';

  @override
  String get feedbackProblem => 'Problem';

  @override
  String get feedbackPraise => 'Thanks';

  @override
  String get feedbackQuestion => 'Question';

  @override
  String get feedbackOther => 'Other';

  @override
  String get feedbackRating => 'Rate the app';

  @override
  String get feedbackMessage => 'Message';

  @override
  String get feedbackMessageHint => 'For example: add a date filter';

  @override
  String get feedbackMessageRequired => 'Write at least a few words';

  @override
  String get feedbackContact => 'How can we reach you (optional)';

  @override
  String get feedbackContactHint => 'Phone, email or Telegram';

  @override
  String get feedbackSent => 'Thank you! Your message was sent to the team.';

  @override
  String get helpQ5 => 'Is there a chat in the app?';

  @override
  String get helpA5 =>
      'Yes. A private chat opens between the finder and the owner once the listing author confirms a claim, so scammers can\'t message everyone. You can also leave open comments under every listing.';
}
