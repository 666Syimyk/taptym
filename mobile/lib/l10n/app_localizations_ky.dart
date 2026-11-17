// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Kirghiz Kyrgyz (`ky`).
class AppLocalizationsKy extends AppLocalizations {
  AppLocalizationsKy([String locale = 'ky']) : super(locale);

  @override
  String get appName => 'Табылды';

  @override
  String get tagline => 'Таптым — жарыяладым. Жоготтум — таптым.';

  @override
  String get onboarding1Title => 'Жоголгон нерсе табылышы мүмкүн';

  @override
  String get onboarding1Body =>
      'Жоготкондор менен тапкандар жолугушкан бирдиктүү жер.';

  @override
  String get onboarding2Title => 'Буюм таптыңызбы? Кайтарууга жардам бериңиз';

  @override
  String get onboarding2Body =>
      'Табылганы сүрөткө тартыңыз — жарнама бир мүнөттө даяр болот.';

  @override
  String get onboarding3Title => 'Коопсуз сүйлөшүңүз';

  @override
  String get onboarding3Body =>
      'Корголгон чат жана ээсин текшерүү алдамчылардан сактайт.';

  @override
  String get continueLabel => 'Улантуу';

  @override
  String get skip => 'Өткөрүп жиберүү';

  @override
  String get chooseLanguage => 'Тилди тандоо';

  @override
  String get languageSheetTitle => 'Колдонмонун тили';

  @override
  String get russian => 'Русский';

  @override
  String get kyrgyz => 'Кыргызча';

  @override
  String get getStarted => 'Баштоо';

  @override
  String get navHome => 'Башкы';

  @override
  String get navLost => 'Жоголгон';

  @override
  String get navCamera => 'Мен таптым';

  @override
  String get navFound => 'Табылган';

  @override
  String get navProfile => 'Профиль';

  @override
  String get homeGreeting => 'Саламатсызбы!';

  @override
  String homeGreetingName(String name) {
    return 'Саламатсызбы, $name!';
  }

  @override
  String get homeGreetingGuest => 'Кош келиңиз';

  @override
  String get homeSubtitle => 'Жоголгонду кайтарууга жардам беребиз';

  @override
  String get searchHint => 'Эмне издеп жатасыз? Мисалы, капчык';

  @override
  String get iLost => 'Мен жоготтум';

  @override
  String get iFound => 'Мен таптым';

  @override
  String get homeHeroLostBody => 'Сүрөттөңүз — окшошун табабыз';

  @override
  String get homeHeroFoundBody => 'Тартыңыз — AI өзү толтурат';

  @override
  String get recentItems => 'Жакында жарыяланган';

  @override
  String get nearby => 'Жакын жердеги жаңы табылгалар';

  @override
  String nearbyIn(String city) {
    return 'Табылгалар: $city';
  }

  @override
  String get chooseCity => 'Шаарды тандаңыз';

  @override
  String get allCities => 'Бүткүл Кыргызстан';

  @override
  String get nothingNearby => 'Бул шаарда азырынча жаңы табылгалар жок';

  @override
  String get categories => 'Категориялар';

  @override
  String get messages => 'Билдирүүлөр';

  @override
  String get safetyTipsTitle => 'Коопсуз кайтаруу';

  @override
  String get safetyTip1 => 'Акчаны алдын ала которбоңуз.';

  @override
  String get safetyTip2 => 'Ырастоо коддорун айтпаңыз.';

  @override
  String get safetyTip3 => 'Эл көп коомдук жерлерде жолугушуңуз.';

  @override
  String get seeAll => 'Баары';

  @override
  String get lostCatalogTitle => 'Жоголгон буюмдар';

  @override
  String get foundCatalogTitle => 'Табылган буюмдар';

  @override
  String get filters => 'Чыпкалар';

  @override
  String get sortLabel => 'Иреттөө';

  @override
  String get sortNewest => 'Адегенде жаңылары';

  @override
  String get sortRelevance => 'Ылайыктуулугу боюнча';

  @override
  String get apply => 'Колдонуу';

  @override
  String get reset => 'Тазалоо';

  @override
  String get category => 'Категория';

  @override
  String get allCategories => 'Бардык категориялар';

  @override
  String get color => 'Түсү';

  @override
  String get district => 'Район';

  @override
  String get city => 'Шаар';

  @override
  String get anyOption => 'Каалаган';

  @override
  String get withReward => 'Сыйлык менен';

  @override
  String get details => 'Толугураак';

  @override
  String get maybeIFoundIt => 'Муну мен тапкан окшойм';

  @override
  String get thisIsMine => 'Бул менин буюмум';

  @override
  String get emptySearch => 'Сурооңуз боюнча азырынча эч нерсе табылган жок';

  @override
  String get changeFilters => 'Чыпкаларды өзгөртүү';

  @override
  String get createListing => 'Жарнама түзүү';

  @override
  String get recentSearches => 'Акыркы суроолор';

  @override
  String get clearRecent => 'Тазалоо';

  @override
  String get suggestions => 'Кеңештер';

  @override
  String resultsCount(int n) {
    return '$n жарнама';
  }

  @override
  String get endOfList => 'Бардык жарнамалар ушул';

  @override
  String get retry => 'Кайталоо';

  @override
  String get errorGeneric => 'Бир нерсе туура эмес болду';

  @override
  String get offlineBanner => 'Байланыш жок. Сакталган маалыматтар көрсөтүлдү.';

  @override
  String get loading => 'Жүктөлүүдө…';

  @override
  String get contentRemoved => 'Жарнама модерация тарабынан өчүрүлгөн';

  @override
  String get itemUnavailable => 'Жарнама жеткиликсиз';

  @override
  String get accessDenied => 'Кирүү мүмкүн эмес';

  @override
  String get statusPublished => 'Жарыяланды';

  @override
  String get statusPendingReview => 'Текшерүүдө';

  @override
  String get statusResolved => 'Кайтарылды';

  @override
  String get statusClosed => 'Жабылды';

  @override
  String get statusRemoved => 'Өчүрүлдү';

  @override
  String get statusDraft => 'Долбоор';

  @override
  String get statusHintPending =>
      'Жарнаманы модератор текшерип жатат. Азырынча аны сиз гана көрөсүз.';

  @override
  String get lostLabel => 'Жоголгон';

  @override
  String get foundLabel => 'Табылган';

  @override
  String get reward => 'Сыйлык';

  @override
  String rewardAmount(String amount) {
    return '$amount сом';
  }

  @override
  String get description => 'Сүрөттөмө';

  @override
  String get visibleFeatures => 'Көрүнгөн белгилер';

  @override
  String get brand => 'Бренд';

  @override
  String get size => 'Өлчөмү';

  @override
  String get date => 'Дата';

  @override
  String get approximateArea => 'Болжолдуу район';

  @override
  String get postedBy => 'Жарыялаган';

  @override
  String get contactHidden =>
      'Байланыштар жашырылган. Табыштама ырасталгандан кийин сүйлөшүү ачылат.';

  @override
  String get trustGuest => 'Конок';

  @override
  String get trustContactVerified => 'Байланыш ырасталган';

  @override
  String get trustEstablished => 'Ишенимдүү катышуучу';

  @override
  String get report => 'Арыздануу';

  @override
  String get share => 'Бөлүшүү';

  @override
  String get linkCopied => 'Шилтеме көчүрүлдү';

  @override
  String get edit => 'Оңдоо';

  @override
  String get moreActions => 'Дагы';

  @override
  String get ownerPanelTitle => 'Жарнаманы башкаруу';

  @override
  String get viewMatches => 'Дал келүүлөр';

  @override
  String get viewClaims => 'Табыштамалар';

  @override
  String pendingClaimsCount(int n) {
    return '$n жаңы';
  }

  @override
  String get markResolved => 'Буюм кайтарылды';

  @override
  String get closeListing => 'Жарнаманы жабуу';

  @override
  String get matchesTitle => 'Окшош буюмдарды тапкан окшойбуз';

  @override
  String get matchesEmpty =>
      'Азырынча дал келүү жок. Пайда болгондо билдиребиз.';

  @override
  String get matchWhy => 'Эмне үчүн муну сунуштайбыз';

  @override
  String get matchDisclaimer =>
      'Дал келүү буюмдун таандыктыгын далилдебейт. Жашыруун белгилерди табыштама аркылуу текшериңиз.';

  @override
  String get check => 'Текшерүү';

  @override
  String get dismiss => 'Жашыруу';

  @override
  String get noPhotoRestricted =>
      'Коопсуздук үчүн бул категорияда сүрөт жарыяланбайт.';

  @override
  String get foundFlowTitle => 'Жаңы табылга';

  @override
  String get lostFlowTitle => 'Эмне жоготтуңуз?';

  @override
  String stepOf(int n, int total) {
    return '$total кадамдын $n-си';
  }

  @override
  String get back => 'Артка';

  @override
  String get next => 'Андан ары';

  @override
  String get stepPhoto => 'Сүрөт';

  @override
  String get stepDetails => 'Сүрөттөмө';

  @override
  String get stepPlace => 'Кайда жана качан';

  @override
  String get stepHidden => 'Жашыруун белгилер';

  @override
  String get stepReview => 'Текшерүү';

  @override
  String get photoStepTitle => 'Табылганы сүрөткө тартыңыз';

  @override
  String get photoStepBody =>
      'Буюмду бүтүндөй, нейтралдуу фондо тартыңыз. Документтер, карталар жана ачкычтар жакындан жарыяланбайт.';

  @override
  String get takePhoto => 'Сүрөткө тартуу';

  @override
  String get pickFromGallery => 'Галереядан тандоо';

  @override
  String get retakePhoto => 'Кайра тартуу';

  @override
  String get removePhoto => 'Сүрөттү өчүрүү';

  @override
  String get photoTaken => 'Сүрөт кошулду';

  @override
  String get noPhotoHint => 'Сүрөт милдеттүү эмес';

  @override
  String get cameraPermissionTitle => 'Камерага уруксат керек';

  @override
  String get cameraPermissionBody =>
      'Камера табылган буюмду сүрөткө тартуу үчүн гана керек. Галереядан да тандасаңыз болот.';

  @override
  String get continueWithoutPhoto => 'Сүрөтсүз улантуу';

  @override
  String get photoProcessing => 'Сүрөт иштетилүүдө…';

  @override
  String get photoBlocked =>
      'Сүрөттө купуя маалымат табылды. Мындай сүрөттү жарыялоого болбойт.';

  @override
  String get photoUnchecked =>
      'Сүрөттү модератор текшерет, андан кийин жарнама тизмеде пайда болот — адатта бир нече сааттын ичинде.';

  @override
  String get aiSuggestionsTitle => 'AI-кеңештер';

  @override
  String get aiSuggestionsOff => 'Кеңештер өчүрүлгөн';

  @override
  String get aiSuggestionsApplied =>
      'Кеңештер колдонулду — текшерип, керек болсо оңдоңуз';

  @override
  String get aiNotSure => 'Категория, түс жана аталышы — сүрөт боюнча';

  @override
  String get useSuggestion => 'Колдонуу';

  @override
  String get detailsStepTitle => 'Буюмду сүрөттөңүз';

  @override
  String get whereWhenTitle => 'Кайда жана качан';

  @override
  String get lostAttributesTitle => 'Ал кандай көрүнөт';

  @override
  String get hiddenStepTitle => 'Жашыруун белгилер';

  @override
  String get reviewStepTitle => 'Жарнаманы текшериңиз';

  @override
  String get titleField => 'Аталышы';

  @override
  String get titleHintFound => 'Мисалы, Кара капчык табылды';

  @override
  String get titleHintLost => 'Мисалы, Көк рюкзак жоголду';

  @override
  String get titleRequired => 'Кеминде 3 белгиден турган аталыш киргизиңиз';

  @override
  String get categoryRequired => 'Категорияны тандаңыз';

  @override
  String get descriptionField => 'Сүрөттөмө (көрүнгөн деталдар гана)';

  @override
  String get colorField => 'Түсү';

  @override
  String get brandField => 'Бренд (белгилүү болсо)';

  @override
  String get sizeField => 'Өлчөмү (тиешелүү болсо)';

  @override
  String get areaField => 'Болжолдуу район';

  @override
  String get chooseArea => 'Районду тандаңыз';

  @override
  String get dateField => 'Качан';

  @override
  String get dateRangeApprox => 'Дата болжолдуу болушу мүмкүн';

  @override
  String get today => 'Бүгүн';

  @override
  String get yesterday => 'Кечээ';

  @override
  String get hiddenFeaturesTitle => 'Жашыруун белгилер';

  @override
  String get hiddenFeaturesHelp =>
      'Ээси гана билген деталдар: гравировка, ичиндегиси, чийилген жери. Алар жарнамада көрсөтүлбөйт жана табыштамаларды текшерүү үчүн керек.';

  @override
  String get hiddenFeatureHint => 'Мисалы, кулпусунда чийик бар';

  @override
  String get addFeature => 'Белги кошуу';

  @override
  String get rewardField => 'Сыйлык (милдеттүү эмес)';

  @override
  String get rewardNote => 'Сыйлыкка комментарий';

  @override
  String get rewardDisclaimer => 'Платформа акчаны сактабайт жана которбойт.';

  @override
  String get notifyMatches => 'Окшош табылгалар жөнүндө билдирүү';

  @override
  String get acceptRules =>
      'Жарыялоо эрежелерин кабыл алам жана башкалардын жеке маалыматын жайгаштырбайм';

  @override
  String get preview => 'Жарнаманы башкалар ушундай көрөт';

  @override
  String get publish => 'Жарыялоо';

  @override
  String get publishing => 'Жарыяланууда…';

  @override
  String get successFoundTitle =>
      'Рахмат! Сиз жоголгон буюмду кайтарууга жардам берип жатасыз';

  @override
  String get successLostTitle => 'Жарнама жарыяланды';

  @override
  String get successPendingReview =>
      'Жарнама текшерүүгө жөнөтүлдү. Адатта бул бир нече саатка чейин созулат.';

  @override
  String get viewListing => 'Жарнаманы көрүү';

  @override
  String get toHome => 'Башкы бетке';

  @override
  String get draftSaved => 'Долбоор сакталды';

  @override
  String get draftRestore => 'Долбоорду улантасызбы?';

  @override
  String get draftRestoreBody =>
      'Сизде бүтпөгөн жарнама бар. Негизги талаалар сакталган.';

  @override
  String get continueDraft => 'Улантуу';

  @override
  String get startOver => 'Кайра баштоо';

  @override
  String matchesFoundCount(int count) {
    return '$count окшош табылга';
  }

  @override
  String get sensitiveCategoryTitle => 'Өзгөчө категория';

  @override
  String get sensitiveDocuments =>
      'Документтер: номерлерди жана сүрөттү жарыялабаңыз. Документтин түрүн сүрөттөңүз, андагы атты көрсөтпөңүз — ээси өзү ырастайт.';

  @override
  String get sensitiveBankCards =>
      'Банк карталары: сүрөткө тартпаңыз жана номерин көрсөтпөңүз. Картаны банкка өткөрүп берүүнү сунуштайбыз.';

  @override
  String get sensitiveKeys =>
      'Ачкычтар: ачкычтын профилинин сүрөтүн жарыялабаңыз жана даректи көрсөтпөңүз.';

  @override
  String get sensitivePhones =>
      'Телефондор: IMEI жарыялабаңыз жана түзмөктү ачууга аракет кылбаңыз.';

  @override
  String get authTitle => 'Кирүү же аккаунт түзүү';

  @override
  String get authBody =>
      'Бул милдеттүү эмес. Жарнамаларыңызды жана кат алышууларыңызды сактап, каалаган түзмөктөн ачуу үчүн телефонду же email ырастаңыз.';

  @override
  String get phone => 'Телефон';

  @override
  String get email => 'Email';

  @override
  String get phoneHint => '+996 700 000 000';

  @override
  String get emailHint => 'name@example.com';

  @override
  String get sendCode => 'Код алуу';

  @override
  String get codeSentTo => 'Код жөнөтүлдү. 6 санды киргизиңиз.';

  @override
  String get codeField => 'Код';

  @override
  String get verify => 'Ырастоо';

  @override
  String get resendCode => 'Кайра жөнөтүү';

  @override
  String devCodeHint(String code) {
    return 'Иштеп чыгуу коду: $code';
  }

  @override
  String get claimTitle => 'Ээсин текшерүү';

  @override
  String get claimIntro =>
      'Буюмду алдамчылардан коргоо үчүн ал чын эле сиздики экенине ынанышыбыз керек.';

  @override
  String get claimFoundReportIntro =>
      'Эмнени жана кайдан тапканыңызды айтыңыз. Ээси муну өзүнүн жашыруун белгилери менен салыштырат.';

  @override
  String get claimMessage => 'Билдирүү (жеке маалыматсыз)';

  @override
  String get evidenceType => 'Ырастоонун түрү';

  @override
  String get evidenceUniqueFeature => 'Уникалдуу белги';

  @override
  String get evidenceContents => 'Ичиндегиси';

  @override
  String get evidencePurchase => 'Сатып алууну ырастоо';

  @override
  String get evidenceOldPhoto => 'Эски сүрөт';

  @override
  String get evidenceOther => 'Башка';

  @override
  String get evidenceText => 'Сүрөттөмө';

  @override
  String get addEvidence => 'Ырастоо кошуу';

  @override
  String get evidenceHint => 'Сүрөттө көрүнбөгөн нерсени сүрөттөңүз';

  @override
  String get submitClaim => 'Табыштама жөнөтүү';

  @override
  String get claimSubmitted => 'Табыштама жөнөтүлдү. Чечим жөнүндө билдиребиз.';

  @override
  String get myClaims => 'Менин табыштамаларым';

  @override
  String get incomingClaims => 'Менин буюмдарыма табыштамалар';

  @override
  String get claimsEmptyMine => 'Сиз азырынча табыштама берген жоксуз';

  @override
  String get claimsEmptyIncoming => 'Буюмдарыңызга азырынча табыштама жок';

  @override
  String get claimStatusLabel => 'Табыштаманын статусу';

  @override
  String get claimStatusSubmitted => 'Жөнөтүлдү';

  @override
  String get claimStatusScreening => 'Текшерилүүдө';

  @override
  String get claimStatusNeedsInfo => 'Тактоо керек';

  @override
  String get claimStatusUnderReview => 'Модератор карап жатат';

  @override
  String get claimStatusPlausible => 'Ырасталды, сүйлөшсө болот';

  @override
  String get claimStatusRejected => 'Четке кагылды';

  @override
  String get claimStatusWithdrawn => 'Кайра алынды';

  @override
  String get claimStatusApprovedHandoff => 'Өткөрүп берүүгө даяр';

  @override
  String get claimStatusCompleted => 'Кайтаруу аяктады';

  @override
  String get decisionTitle => 'Сиздин чечимиңиз';

  @override
  String get decisionPlausible => 'Чындыкка окшош';

  @override
  String get decisionNeedsInfo => 'Тактоо суроо';

  @override
  String get decisionReject => 'Четке кагуу';

  @override
  String get decisionNote => 'Комментарий (милдеттүү эмес)';

  @override
  String get withdrawClaim => 'Табыштаманы кайра алуу';

  @override
  String get openChat => 'Чатты ачуу';

  @override
  String get yourHiddenFeatures =>
      'Салыштыруу үчүн сиздин жашыруун белгилериңиз';

  @override
  String get evidenceFromClaimant => 'Арыз ээсинин ырастоолору';

  @override
  String get dispute => 'Талашуу';

  @override
  String get claimantLabel => 'Арыз ээси';

  @override
  String get chatsTitle => 'Билдирүүлөр';

  @override
  String get chatsEmpty =>
      'Азырынча диалог жок. Чат табыштама ырасталгандан кийин ачылат.';

  @override
  String get messageHint => 'Билдирүү…';

  @override
  String get send => 'Жөнөтүү';

  @override
  String get attachPhoto => 'Сүрөт тиркөө';

  @override
  String get systemMessage => 'Система';

  @override
  String get connectionLive => 'онлайн';

  @override
  String get connectionReconnecting => 'кайра туташуу…';

  @override
  String get chatClosedBanner => 'Диалог аяктады';

  @override
  String get warningAdvancePayment =>
      'Маектеш алдын ала төлөм жөнүндө айтып жатат. Буюмду албай туруп акча которбоңуз.';

  @override
  String get warningOtp => 'Ырастоо коддорун эч кимге айтпаңыз.';

  @override
  String get warningLink => 'Тышкы шилтемелерге сак болуңуз.';

  @override
  String get blockUser => 'Бөгөттөө';

  @override
  String get closeChat => 'Диалогду аяктоо';

  @override
  String get handoffActions => 'Кайтаруу';

  @override
  String get handoffTitle => 'Буюмду өткөрүп берүү';

  @override
  String get handoffPropose => 'Өткөрүп берүүгө макулдашуу';

  @override
  String get handoffMethodMeeting => 'Жеке жолугушуу';

  @override
  String get handoffMethodOther => 'Башка ыкма';

  @override
  String get handoffPlaceHint => 'Кайда жолугабыз? Эл көп жерди тандаңыз';

  @override
  String get handoffCreate => 'Сунуштоо';

  @override
  String get handoffStep1 => 'Сунуш';

  @override
  String get handoffStep2 => 'Сиздин ырастооңуз';

  @override
  String get handoffStep3 => 'Экинчи тараптын ырастоосу';

  @override
  String get handoffStep4 => 'Аяктады';

  @override
  String get handoffCodeTitle => 'Ырастоо коду';

  @override
  String get handoffCodeHolder =>
      'Өткөрүп берүүдө бул кодду алуучуга айтыңыз. Ал 72 саат жарактуу.';

  @override
  String get handoffCodeReceiver => 'Тапкан адам айткан кодду киргизиңиз';

  @override
  String handoffCodeExpires(String time) {
    return '$time чейин жарактуу';
  }

  @override
  String get handoffConfirm => 'Өткөрүп берүүнү ырастоо';

  @override
  String get handoffWaiting => 'Экинчи тараптын ырастоосун күтүп жатабыз';

  @override
  String get handoffCompleted =>
      'Кайтаруу эки тарап тарабынан ырасталды. Рахмат!';

  @override
  String get handoffDisclaimer =>
      'Код колдонмодогу аракетти ырастайт, бирок өзү менчик укугун же физикалык өткөрүп берүүнү далилдебейт.';

  @override
  String get profileTitle => 'Профиль';

  @override
  String get guestProfileBody =>
      'Каттоонун кереги жок: табылгаларды дароо сүрөткө тартып жарыялай аласыз. Жарнамаларды жана кат алышууларды башка түзмөктөрдө сактагыңыз келгенде кириңиз.';

  @override
  String get sectionMine => 'Меники';

  @override
  String get sectionSettings => 'Жөндөөлөр';

  @override
  String get sectionSafety => 'Коопсуздук жана жардам';

  @override
  String get myListings => 'Менин жарнамаларым';

  @override
  String get myMessages => 'Менин билдирүүлөрүм';

  @override
  String get returnsHistory => 'Кайтаруулардын тарыхы';

  @override
  String get returnsEmpty => 'Аяктаган кайтаруулар азырынча жок';

  @override
  String activeListings(int n) {
    return '$n активдүү жарнама';
  }

  @override
  String get notifications => 'Билдирмелер';

  @override
  String get language => 'Тил';

  @override
  String get appearance => 'Көрүнүшү';

  @override
  String get themeSystem => 'Системадагыдай';

  @override
  String get themeLight => 'Ачык';

  @override
  String get themeDark => 'Караңгы';

  @override
  String get privacy => 'Купуялык';

  @override
  String get security => 'Коопсуздук';

  @override
  String get sessions => 'Активдүү сессиялар';

  @override
  String get revokeAll => 'Бардык түзмөктөрдөн чыгуу';

  @override
  String get help => 'Жардам';

  @override
  String get helpQ1 => 'Буюм меники экенин кантип ырастайм?';

  @override
  String get helpA1 =>
      'Табыштама бериңиз жана сүрөттө көрүнбөгөн нерсени сүрөттөңүз: гравировка, ичиндегиси, кемчилик. Тапкан адам муну жашыруун белгилер менен салыштырат.';

  @override
  String get helpQ2 => 'Эмне үчүн чат дароо ачылбайт?';

  @override
  String get helpA2 =>
      'Чат жарнаманын автору табыштаманы чындыкка окшош деп тапкандан кийин гана пайда болот. Бул алдамчылардан коргойт.';

  @override
  String get helpQ3 => 'Платформа кайтаруу үчүн акча алабы?';

  @override
  String get helpA3 =>
      'Жок. Сыйлык — тараптардын жеке макулдашуусу. Колдонмо акчаны сактабайт жана которбойт.';

  @override
  String get helpQ4 =>
      'Табылган документтер же карталар менен эмне кылуу керек?';

  @override
  String get helpA4 =>
      'Сүрөттү жана номерлерди жарыялабаңыз. Документтин түрүн сүрөттөп, аны банкка же расмий мекемеге өткөрүп бериңиз.';

  @override
  String get aboutApp => 'Колдонмо жөнүндө';

  @override
  String versionLabel(String v) {
    return 'Версия $v';
  }

  @override
  String get deleteAccount => 'Аккаунтту өчүрүү';

  @override
  String get deleteAccountConfirm =>
      'Аккаунт анонимделет, байланыштар жана сессиялар өчүрүлөт, жарнамалар жабылат. Бул аракетти кайтарууга болбойт.';

  @override
  String get logout => 'Чыгуу';

  @override
  String get publicName => 'Колдонмодогу ат';

  @override
  String get save => 'Сактоо';

  @override
  String get cancel => 'Жокко чыгаруу';

  @override
  String get delete => 'Өчүрүү';

  @override
  String get close => 'Жабуу';

  @override
  String get done => 'Даяр';

  @override
  String get optional => 'милдеттүү эмес';

  @override
  String get notifMatches => 'Окшош табылгалар';

  @override
  String get notifMessages => 'Билдирүүлөр';

  @override
  String get privacyBody =>
      'Биз болжолдуу районду гана көрсөтөбүз, сүрөттөрдүн метамаалыматын өчүрөбүз, байланыштарды жашырабыз жана жашыруун белгилерди өзүнчө сактайбыз. Чат серверде корголгон; баштан-аяк шифрлөө жок.';

  @override
  String get notificationsEmpty => 'Азырынча билдирме жок';

  @override
  String get markAllRead => 'Баарын окулду деп белгилөө';

  @override
  String get reportTitle => 'Арыз';

  @override
  String get reportReasonFraud => 'Алдамчылык';

  @override
  String get reportReasonSpam => 'Спам';

  @override
  String get reportReasonInappropriate => 'Жараксыз мазмун';

  @override
  String get reportReasonPersonalData => 'Жеке маалымат';

  @override
  String get reportReasonWrongCategory => 'Туура эмес категория';

  @override
  String get reportReasonHarassment => 'Куугунтуктоо';

  @override
  String get reportReasonOther => 'Башка';

  @override
  String get reportDetails => 'Чоо-жайы (милдеттүү эмес)';

  @override
  String get reportSent => 'Арыз жөнөтүлдү. Рахмат!';

  @override
  String get colorBlack => 'Кара';

  @override
  String get colorWhite => 'Ак';

  @override
  String get colorGray => 'Боз';

  @override
  String get colorRed => 'Кызыл';

  @override
  String get colorOrange => 'Кызгылт сары';

  @override
  String get colorYellow => 'Сары';

  @override
  String get colorGreen => 'Жашыл';

  @override
  String get colorBlue => 'Көк';

  @override
  String get colorPurple => 'Кочкул көк';

  @override
  String get colorPink => 'Кызгылт';

  @override
  String get colorBrown => 'Күрөң';

  @override
  String get colorBeige => 'Бежевый';

  @override
  String get colorGold => 'Алтын түстүү';

  @override
  String get colorSilver => 'Күмүш түстүү';

  @override
  String get colorMulticolor => 'Ар түстүү';

  @override
  String get justNow => 'азыр эле';

  @override
  String minutesAgo(int n) {
    return '$n мүн мурун';
  }

  @override
  String hoursAgo(int n) {
    return '$n с мурун';
  }

  @override
  String daysAgo(int n) {
    return '$n күн мурун';
  }

  @override
  String get aiAnalyzing => 'Сүрөттөгү буюмду таанып жатабыз…';

  @override
  String get aiAnalyzingBody =>
      'AI категорияны, түсүн, брендин жана моделин аныктап, сүрөттөмөнү толтурат';

  @override
  String aiFilled(String fields) {
    return 'AI толтурду: $fields. Текшерип, керек болсо оңдоңуз';
  }

  @override
  String get aiTitle => 'аталышы';

  @override
  String get aiPhotoHint =>
      'Сүрөт бүдөмүк же караңгы — AI көбүрөөк талааны толтурушу үчүн жарыкта кайра тартыңыз';

  @override
  String get phoneForListing => 'Телефонуңуз';

  @override
  String get phoneListingNote =>
      'Жарнамада номер жашырылат. Аны буюмга арызын сиз жактырган адам гана көрөт.';

  @override
  String get phoneRequired => 'Телефон номерин жазыңыз';

  @override
  String get locationRequired => 'Буюм табылган же жоголгон районду тандаңыз';

  @override
  String get editDetails => 'Сүрөттөмөнү өзгөртүү';

  @override
  String aiRecognized(String item) {
    return 'AI тааныды: $item';
  }

  @override
  String get contactPhoneTitle => 'Байланыш телефону';

  @override
  String get copyPhone => 'Номерди көчүрүү';

  @override
  String get phoneCopied => 'Номер көчүрүлдү';

  @override
  String get aiResultTitle => 'AI тааныды';

  @override
  String get aiResultHint => 'Оңдоо үчүн талааны басыңыз';

  @override
  String get aiResultUnsure =>
      'Буюмду так аныктай алган жокпуз — кийинки кадамда категорияны тандаңыз';

  @override
  String aiMaybe(String category) {
    return 'Балким: $category';
  }

  @override
  String get aiFromText => 'Сүрөттөмө боюнча тандалды';

  @override
  String get chooseCategory => 'Категорияны тандаңыз';

  @override
  String get chooseColor => 'Түстү тандаңыз';

  @override
  String get notSet => 'көрсөтүлгөн эмес';

  @override
  String get publishConsent =>
      '«Жарыялоо» баскычын басуу менен жарыялоо эрежелерин кабыл аласыз жана башкалардын жеке маалыматын жайгаштырбай турганыңызды ырастайсыз.';

  @override
  String get homeEmptyRecent => 'Азырынча бош — биринчи табылганды жарыялаңыз';

  @override
  String get locateButton => 'Жайгашкан жер боюнча аныктоо';

  @override
  String locateDone(String area) {
    return 'Район аныкталды: $area. Төмөндө өзгөртсөңүз болот.';
  }

  @override
  String get locateDenied =>
      'Жайгашкан жерге уруксат жок — районду өзүңүз тандаңыз.';

  @override
  String get locateNotFound =>
      'Жакын жерде белгилүү район жок — өзүңүз тандаңыз.';

  @override
  String get locateFailed =>
      'Жайгашкан жерди аныктоо мүмкүн болгон жок — районду өзүңүз тандаңыз.';

  @override
  String get scamTitle => 'Кантип алдашат жана кантип сактануу керек';

  @override
  String get scam1t => '«Буюмуңузду таптым, жеткирүү үчүн акча которуңуз»';

  @override
  String get scam1d =>
      'Чыныгы тапкан адам акчаны алдын ала сурабайт. Жашыруун белгисин атоону сураңыз жана жеке жолугуңуз.';

  @override
  String get scam2t => '«Бул менин буюмум», бирок белгилерин айта албайт';

  @override
  String get scam2d =>
      'Чыныгы ээси жарнамада жок нерсени атайт. Текшербей бербеңиз.';

  @override
  String get scam3t => '«СМСтеги кодду айтыңыз»';

  @override
  String get scam3d =>
      'Бул акчаңызды же аккаунтуңузду уурдоо. Буюмду кайтарууга код, PIN жана картанын маалыматы керек эмес.';

  @override
  String get scam4t => '«Мен Табылдынын кызматкеримин»';

  @override
  String get scam4d =>
      'Табылды сизге чалбайт, акча жана маалымат сурабайт. Мындай чалууларга ишенбеңиз.';

  @override
  String get scam5t => '«Акча төлөсөңүз гана кайтарам»';

  @override
  String get scam5d =>
      'Макул болбоңуз жана жарнамага даттаныңыз. Коркутушса — 102ге чалыңыз.';

  @override
  String get scamHelp =>
      'Алданып калсаңыз: жарнамага же маектешке даттаныңыз, кат алышууну сактаңыз жана милицияга кайрылыңыз (102).';

  @override
  String get english => 'English';

  @override
  String get commentsTitle => 'Комментарийлер';

  @override
  String commentsCount(int n) {
    return 'Комментарийлер · $n';
  }

  @override
  String get commentsEmpty =>
      'Азырынча комментарий жок. Бул буюмду көрдүңүзбү же кайда экенин билесизби? Жазыңыз.';

  @override
  String get commentHint => 'Комментарий жазуу…';

  @override
  String get commentRules =>
      'Комментарийлерди баары көрөт. Телефон, дарек жана буюмдун жашыруун белгилерин жазбаңыз — байланыш үчүн табыштама бар.';

  @override
  String get commentByOwner => 'Жарнаманын автору';

  @override
  String get commentDelete => 'Комментарийди өчүрүү';

  @override
  String get commentDeleted => 'Комментарий өчүрүлдү';

  @override
  String get commentsClosed =>
      'Жарнама жабылган — жаңы комментарий калтырууга болбойт.';

  @override
  String get notifComments => 'Жарнамаларыма комментарийлер';

  @override
  String get contactUs => 'Биз менен байланышуу';

  @override
  String get contactUsSubtitle =>
      'Сунуштар, көйгөйлөр жана тиркеме тууралуу пикирлер';

  @override
  String get feedbackIntro =>
      'Эмнени жакшыртуу керек, эмне иштебей жатат же эмне жакты — жазыңыз. Команда ар бир билдирүүнү окуйт.';

  @override
  String get feedbackKind => 'Тема';

  @override
  String get feedbackIdea => 'Сунуш';

  @override
  String get feedbackProblem => 'Көйгөй';

  @override
  String get feedbackPraise => 'Ыраазычылык';

  @override
  String get feedbackQuestion => 'Суроо';

  @override
  String get feedbackOther => 'Башка';

  @override
  String get feedbackRating => 'Тиркемеге баа';

  @override
  String get feedbackMessage => 'Билдирүү';

  @override
  String get feedbackMessageHint => 'Мисалы: дата боюнча чыпка кошуңуз';

  @override
  String get feedbackMessageRequired => 'Жок дегенде бир нече сөз жазыңыз';

  @override
  String get feedbackContact =>
      'Сиз менен кантип байланышабыз (милдеттүү эмес)';

  @override
  String get feedbackContactHint => 'Телефон, email же Telegram';

  @override
  String get feedbackSent => 'Рахмат! Билдирүү командага жөнөтүлдү.';

  @override
  String get helpQ5 => 'Тиркемеде чат барбы?';

  @override
  String get helpA5 =>
      'Ооба. Жарнаманын автору табыштаманы ырастагандан кийин тапкан адам менен ээсинин ортосунда жеке чат ачылат — ошентип алдамчылар баарына жаза албайт. Ар бир жарнаманын астына ачык комментарий да калтырса болот.';
}
