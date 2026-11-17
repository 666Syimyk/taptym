// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Russian (`ru`).
class AppLocalizationsRu extends AppLocalizations {
  AppLocalizationsRu([String locale = 'ru']) : super(locale);

  @override
  String get appName => 'Табылды';

  @override
  String get tagline => 'Нашёл — опубликовал. Потерял — нашёл.';

  @override
  String get onboarding1Title => 'Потерянное может найтись';

  @override
  String get onboarding1Body =>
      'Единое место, где встречаются те, кто потерял, и те, кто нашёл.';

  @override
  String get onboarding2Title => 'Нашли вещь? Помогите вернуть';

  @override
  String get onboarding2Body =>
      'Сфотографируйте находку — объявление будет готово за минуту.';

  @override
  String get onboarding3Title => 'Общайтесь безопасно';

  @override
  String get onboarding3Body =>
      'Защищённый чат и проверка владельца оберегают от мошенников.';

  @override
  String get continueLabel => 'Продолжить';

  @override
  String get skip => 'Пропустить';

  @override
  String get chooseLanguage => 'Выбрать язык';

  @override
  String get languageSheetTitle => 'Язык приложения';

  @override
  String get russian => 'Русский';

  @override
  String get kyrgyz => 'Кыргызча';

  @override
  String get getStarted => 'Начать';

  @override
  String get navHome => 'Главная';

  @override
  String get navLost => 'Потеряно';

  @override
  String get navCamera => 'Я нашёл';

  @override
  String get navFound => 'Найдено';

  @override
  String get navProfile => 'Профиль';

  @override
  String get homeGreeting => 'Здравствуйте!';

  @override
  String homeGreetingName(String name) {
    return 'Здравствуйте, $name!';
  }

  @override
  String get homeGreetingGuest => 'Добро пожаловать';

  @override
  String get homeSubtitle => 'Поможем вернуть потерянное';

  @override
  String get searchHint => 'Что ищете? Например, кошелёк';

  @override
  String get iLost => 'Я потерял';

  @override
  String get iFound => 'Я нашёл';

  @override
  String get homeHeroLostBody => 'Опишите — найдём похожие';

  @override
  String get homeHeroFoundBody => 'Снимите — AI заполнит сам';

  @override
  String get recentItems => 'Недавно опубликовано';

  @override
  String get nearby => 'Новые находки рядом';

  @override
  String nearbyIn(String city) {
    return 'Находки: $city';
  }

  @override
  String get chooseCity => 'Выберите город';

  @override
  String get allCities => 'Весь Кыргызстан';

  @override
  String get nothingNearby => 'В этом городе пока нет новых находок';

  @override
  String get categories => 'Категории';

  @override
  String get messages => 'Сообщения';

  @override
  String get safetyTipsTitle => 'Безопасный возврат';

  @override
  String get safetyTip1 => 'Не переводите деньги заранее.';

  @override
  String get safetyTip2 => 'Не сообщайте коды подтверждения.';

  @override
  String get safetyTip3 => 'Встречайтесь в людных общественных местах.';

  @override
  String get seeAll => 'Все';

  @override
  String get lostCatalogTitle => 'Потерянные вещи';

  @override
  String get foundCatalogTitle => 'Найденные вещи';

  @override
  String get filters => 'Фильтры';

  @override
  String get sortLabel => 'Сортировка';

  @override
  String get sortNewest => 'Сначала новые';

  @override
  String get sortRelevance => 'По релевантности';

  @override
  String get apply => 'Применить';

  @override
  String get reset => 'Сбросить';

  @override
  String get category => 'Категория';

  @override
  String get allCategories => 'Все категории';

  @override
  String get color => 'Цвет';

  @override
  String get district => 'Район';

  @override
  String get city => 'Город';

  @override
  String get anyOption => 'Любой';

  @override
  String get withReward => 'С вознаграждением';

  @override
  String get details => 'Подробнее';

  @override
  String get maybeIFoundIt => 'Возможно, я нашёл это';

  @override
  String get thisIsMine => 'Это моя вещь';

  @override
  String get emptySearch => 'По вашему запросу пока ничего не найдено';

  @override
  String get changeFilters => 'Изменить фильтры';

  @override
  String get createListing => 'Создать объявление';

  @override
  String get recentSearches => 'Недавние запросы';

  @override
  String get clearRecent => 'Очистить';

  @override
  String get suggestions => 'Подсказки';

  @override
  String resultsCount(int n) {
    return '$n объявлений';
  }

  @override
  String get endOfList => 'Это все объявления';

  @override
  String get retry => 'Повторить';

  @override
  String get errorGeneric => 'Что-то пошло не так';

  @override
  String get offlineBanner => 'Нет подключения. Показаны сохранённые данные.';

  @override
  String get loading => 'Загрузка…';

  @override
  String get contentRemoved => 'Объявление удалено модерацией';

  @override
  String get itemUnavailable => 'Объявление недоступно';

  @override
  String get accessDenied => 'Нет доступа';

  @override
  String get statusPublished => 'Опубликовано';

  @override
  String get statusPendingReview => 'На проверке';

  @override
  String get statusResolved => 'Возвращено';

  @override
  String get statusClosed => 'Закрыто';

  @override
  String get statusRemoved => 'Удалено';

  @override
  String get statusDraft => 'Черновик';

  @override
  String get statusHintPending =>
      'Объявление проверяет модератор. Пока его видите только вы.';

  @override
  String get lostLabel => 'Потеряно';

  @override
  String get foundLabel => 'Найдено';

  @override
  String get reward => 'Вознаграждение';

  @override
  String rewardAmount(String amount) {
    return '$amount сом';
  }

  @override
  String get description => 'Описание';

  @override
  String get visibleFeatures => 'Видимые характеристики';

  @override
  String get brand => 'Бренд';

  @override
  String get size => 'Размер';

  @override
  String get date => 'Дата';

  @override
  String get approximateArea => 'Примерный район';

  @override
  String get postedBy => 'Разместил';

  @override
  String get contactHidden =>
      'Контакты скрыты. Общение откроется после подтверждения заявки.';

  @override
  String get trustGuest => 'Гость';

  @override
  String get trustContactVerified => 'Контакт подтверждён';

  @override
  String get trustEstablished => 'Надёжный участник';

  @override
  String get report => 'Пожаловаться';

  @override
  String get share => 'Поделиться';

  @override
  String get linkCopied => 'Ссылка скопирована';

  @override
  String get edit => 'Редактировать';

  @override
  String get moreActions => 'Ещё';

  @override
  String get ownerPanelTitle => 'Управление объявлением';

  @override
  String get viewMatches => 'Совпадения';

  @override
  String get viewClaims => 'Заявки';

  @override
  String pendingClaimsCount(int n) {
    return '$n новых';
  }

  @override
  String get markResolved => 'Вещь возвращена';

  @override
  String get closeListing => 'Закрыть объявление';

  @override
  String get matchesTitle => 'Возможно, мы нашли похожие вещи';

  @override
  String get matchesEmpty => 'Пока совпадений нет. Мы сообщим, когда появятся.';

  @override
  String get matchWhy => 'Почему мы это предлагаем';

  @override
  String get matchDisclaimer =>
      'Совпадение не доказывает принадлежность. Проверьте скрытые признаки через заявку.';

  @override
  String get check => 'Проверить';

  @override
  String get dismiss => 'Скрыть';

  @override
  String get noPhotoRestricted =>
      'Фото для этой категории не публикуется ради безопасности.';

  @override
  String get foundFlowTitle => 'Новая находка';

  @override
  String get lostFlowTitle => 'Что вы потеряли?';

  @override
  String stepOf(int n, int total) {
    return 'Шаг $n из $total';
  }

  @override
  String get back => 'Назад';

  @override
  String get next => 'Далее';

  @override
  String get stepPhoto => 'Фото';

  @override
  String get stepDetails => 'Описание';

  @override
  String get stepPlace => 'Где и когда';

  @override
  String get stepHidden => 'Скрытые признаки';

  @override
  String get stepReview => 'Проверка';

  @override
  String get photoStepTitle => 'Сфотографируйте находку';

  @override
  String get photoStepBody =>
      'Снимите вещь целиком на нейтральном фоне. Документы, карты и ключи крупным планом не публикуются.';

  @override
  String get takePhoto => 'Сделать фото';

  @override
  String get pickFromGallery => 'Выбрать из галереи';

  @override
  String get retakePhoto => 'Переснять';

  @override
  String get removePhoto => 'Удалить фото';

  @override
  String get photoTaken => 'Фото добавлено';

  @override
  String get noPhotoHint => 'Фото необязательно';

  @override
  String get cameraPermissionTitle => 'Нужен доступ к камере';

  @override
  String get cameraPermissionBody =>
      'Камера нужна только чтобы сфотографировать найденную вещь. Можно выбрать фото из галереи.';

  @override
  String get continueWithoutPhoto => 'Продолжить без фото';

  @override
  String get photoProcessing => 'Обрабатываем фото…';

  @override
  String get photoBlocked =>
      'На фото обнаружены конфиденциальные данные. Такое изображение нельзя публиковать.';

  @override
  String get photoUnchecked =>
      'Фото проверит модератор, после этого объявление появится в ленте — обычно в течение нескольких часов.';

  @override
  String get aiSuggestionsTitle => 'AI-подсказки';

  @override
  String get aiSuggestionsOff => 'Подсказки отключены';

  @override
  String get aiSuggestionsApplied =>
      'Подсказки применены — проверьте и исправьте при необходимости';

  @override
  String get aiNotSure => 'Категория, цвет и название — по фото';

  @override
  String get useSuggestion => 'Применить';

  @override
  String get detailsStepTitle => 'Опишите вещь';

  @override
  String get whereWhenTitle => 'Где и когда';

  @override
  String get lostAttributesTitle => 'Как она выглядит';

  @override
  String get hiddenStepTitle => 'Скрытые признаки';

  @override
  String get reviewStepTitle => 'Проверьте объявление';

  @override
  String get titleField => 'Название';

  @override
  String get titleHintFound => 'Например, Найден чёрный кошелёк';

  @override
  String get titleHintLost => 'Например, Потерял синий рюкзак';

  @override
  String get titleRequired => 'Введите название не короче 3 символов';

  @override
  String get categoryRequired => 'Выберите категорию';

  @override
  String get descriptionField => 'Описание (только видимые детали)';

  @override
  String get colorField => 'Цвет';

  @override
  String get brandField => 'Бренд (если известен)';

  @override
  String get sizeField => 'Размер (если применимо)';

  @override
  String get areaField => 'Примерный район';

  @override
  String get chooseArea => 'Выберите район';

  @override
  String get dateField => 'Когда';

  @override
  String get dateRangeApprox => 'Дата может быть приблизительной';

  @override
  String get today => 'Сегодня';

  @override
  String get yesterday => 'Вчера';

  @override
  String get hiddenFeaturesTitle => 'Скрытые признаки';

  @override
  String get hiddenFeaturesHelp =>
      'Детали, которые знает только владелец: гравировка, содержимое, царапина. Они не показываются в объявлении и нужны для проверки заявок.';

  @override
  String get hiddenFeatureHint => 'Например, царапина на замке';

  @override
  String get addFeature => 'Добавить признак';

  @override
  String get rewardField => 'Вознаграждение (необязательно)';

  @override
  String get rewardNote => 'Комментарий к вознаграждению';

  @override
  String get rewardDisclaimer => 'Платформа не хранит и не переводит деньги.';

  @override
  String get notifyMatches => 'Сообщать о похожих находках';

  @override
  String get acceptRules =>
      'Я принимаю правила публикации и не размещаю чужие личные данные';

  @override
  String get preview => 'Так объявление увидят другие';

  @override
  String get publish => 'Опубликовать';

  @override
  String get publishing => 'Публикуем…';

  @override
  String get successFoundTitle =>
      'Спасибо! Вы помогаете вернуть потерянную вещь';

  @override
  String get successLostTitle => 'Объявление опубликовано';

  @override
  String get successPendingReview =>
      'Объявление отправлено на проверку. Обычно это занимает до нескольких часов.';

  @override
  String get viewListing => 'Посмотреть объявление';

  @override
  String get toHome => 'На главную';

  @override
  String get draftSaved => 'Черновик сохранён';

  @override
  String get draftRestore => 'Продолжить черновик?';

  @override
  String get draftRestoreBody =>
      'У вас есть незавершённое объявление. Основные поля сохранены.';

  @override
  String get continueDraft => 'Продолжить';

  @override
  String get startOver => 'Начать заново';

  @override
  String matchesFoundCount(int count) {
    return '$count похожих находок';
  }

  @override
  String get sensitiveCategoryTitle => 'Особая категория';

  @override
  String get sensitiveDocuments =>
      'Документы: не публикуйте номера и фото. Опишите тип документа, имя на нём не указывайте — владелец подтвердит его сам.';

  @override
  String get sensitiveBankCards =>
      'Банковские карты: не фотографируйте и не указывайте номер. Рекомендуем передать карту в банк.';

  @override
  String get sensitiveKeys =>
      'Ключи: не публикуйте фото профиля ключа и не указывайте адрес.';

  @override
  String get sensitivePhones =>
      'Телефоны: не публикуйте IMEI и не пытайтесь разблокировать устройство.';

  @override
  String get authTitle => 'Войти или создать аккаунт';

  @override
  String get authBody =>
      'Это необязательно. Подтвердите телефон или email, чтобы сохранить свои объявления и переписку и открывать их с любого устройства.';

  @override
  String get phone => 'Телефон';

  @override
  String get email => 'Email';

  @override
  String get phoneHint => '+996 700 000 000';

  @override
  String get emailHint => 'name@example.com';

  @override
  String get sendCode => 'Получить код';

  @override
  String get codeSentTo => 'Код отправлен. Введите 6 цифр.';

  @override
  String get codeField => 'Код';

  @override
  String get verify => 'Подтвердить';

  @override
  String get resendCode => 'Отправить ещё раз';

  @override
  String devCodeHint(String code) {
    return 'Код для разработки: $code';
  }

  @override
  String get claimTitle => 'Проверка владельца';

  @override
  String get claimIntro =>
      'Чтобы защитить вещь от мошенников, нам нужно убедиться, что она действительно ваша.';

  @override
  String get claimFoundReportIntro =>
      'Расскажите, что вы нашли и где. Владелец сравнит это со своими скрытыми признаками.';

  @override
  String get claimMessage => 'Сообщение (без личных данных)';

  @override
  String get evidenceType => 'Тип подтверждения';

  @override
  String get evidenceUniqueFeature => 'Уникальный признак';

  @override
  String get evidenceContents => 'Содержимое';

  @override
  String get evidencePurchase => 'Подтверждение покупки';

  @override
  String get evidenceOldPhoto => 'Старое фото';

  @override
  String get evidenceOther => 'Другое';

  @override
  String get evidenceText => 'Описание';

  @override
  String get addEvidence => 'Добавить подтверждение';

  @override
  String get evidenceHint => 'Опишите то, чего не видно на фото';

  @override
  String get submitClaim => 'Отправить заявку';

  @override
  String get claimSubmitted => 'Заявка отправлена. Мы сообщим о решении.';

  @override
  String get myClaims => 'Мои заявки';

  @override
  String get incomingClaims => 'Заявки на мои вещи';

  @override
  String get claimsEmptyMine => 'Вы ещё не подавали заявок';

  @override
  String get claimsEmptyIncoming => 'Заявок на ваши вещи пока нет';

  @override
  String get claimStatusLabel => 'Статус заявки';

  @override
  String get claimStatusSubmitted => 'Отправлена';

  @override
  String get claimStatusScreening => 'Проверяется';

  @override
  String get claimStatusNeedsInfo => 'Нужны уточнения';

  @override
  String get claimStatusUnderReview => 'На рассмотрении модератора';

  @override
  String get claimStatusPlausible => 'Подтверждена, можно общаться';

  @override
  String get claimStatusRejected => 'Отклонена';

  @override
  String get claimStatusWithdrawn => 'Отозвана';

  @override
  String get claimStatusApprovedHandoff => 'Готова к передаче';

  @override
  String get claimStatusCompleted => 'Возврат завершён';

  @override
  String get decisionTitle => 'Ваше решение';

  @override
  String get decisionPlausible => 'Похоже на правду';

  @override
  String get decisionNeedsInfo => 'Запросить уточнения';

  @override
  String get decisionReject => 'Отклонить';

  @override
  String get decisionNote => 'Комментарий (необязательно)';

  @override
  String get withdrawClaim => 'Отозвать заявку';

  @override
  String get openChat => 'Открыть чат';

  @override
  String get yourHiddenFeatures => 'Ваши скрытые признаки для сравнения';

  @override
  String get evidenceFromClaimant => 'Подтверждения от заявителя';

  @override
  String get dispute => 'Оспорить';

  @override
  String get claimantLabel => 'Заявитель';

  @override
  String get chatsTitle => 'Сообщения';

  @override
  String get chatsEmpty =>
      'Пока нет диалогов. Чат открывается после подтверждения заявки.';

  @override
  String get messageHint => 'Сообщение…';

  @override
  String get send => 'Отправить';

  @override
  String get attachPhoto => 'Прикрепить фото';

  @override
  String get systemMessage => 'Система';

  @override
  String get connectionLive => 'онлайн';

  @override
  String get connectionReconnecting => 'переподключение…';

  @override
  String get chatClosedBanner => 'Диалог завершён';

  @override
  String get warningAdvancePayment =>
      'Собеседник упоминает предоплату. Не переводите деньги до получения вещи.';

  @override
  String get warningOtp => 'Никому не сообщайте коды подтверждения.';

  @override
  String get warningLink => 'Будьте осторожны с внешними ссылками.';

  @override
  String get blockUser => 'Заблокировать';

  @override
  String get closeChat => 'Завершить диалог';

  @override
  String get handoffActions => 'Возврат';

  @override
  String get handoffTitle => 'Передача вещи';

  @override
  String get handoffPropose => 'Договориться о передаче';

  @override
  String get handoffMethodMeeting => 'Личная встреча';

  @override
  String get handoffMethodOther => 'Другой способ';

  @override
  String get handoffPlaceHint => 'Где встретимся? Выберите людное место';

  @override
  String get handoffCreate => 'Предложить';

  @override
  String get handoffStep1 => 'Предложение';

  @override
  String get handoffStep2 => 'Ваше подтверждение';

  @override
  String get handoffStep3 => 'Подтверждение второй стороны';

  @override
  String get handoffStep4 => 'Завершено';

  @override
  String get handoffCodeTitle => 'Код подтверждения';

  @override
  String get handoffCodeHolder =>
      'Назовите этот код получателю при передаче. Он действует 72 часа.';

  @override
  String get handoffCodeReceiver => 'Введите код, который назовёт вам нашедший';

  @override
  String handoffCodeExpires(String time) {
    return 'Действует до $time';
  }

  @override
  String get handoffConfirm => 'Подтвердить передачу';

  @override
  String get handoffWaiting => 'Ждём подтверждения второй стороны';

  @override
  String get handoffCompleted =>
      'Возврат подтверждён обеими сторонами. Спасибо!';

  @override
  String get handoffDisclaimer =>
      'Код подтверждает действие в приложении, но сам по себе не доказывает право собственности или физическую передачу.';

  @override
  String get profileTitle => 'Профиль';

  @override
  String get guestProfileBody =>
      'Регистрация не нужна: находки можно сразу фотографировать и публиковать. Войдите, когда захотите сохранить объявления и переписку на других устройствах.';

  @override
  String get sectionMine => 'Моё';

  @override
  String get sectionSettings => 'Настройки';

  @override
  String get sectionSafety => 'Безопасность и помощь';

  @override
  String get myListings => 'Мои объявления';

  @override
  String get myMessages => 'Мои сообщения';

  @override
  String get returnsHistory => 'История возвратов';

  @override
  String get returnsEmpty => 'Завершённых возвратов пока нет';

  @override
  String activeListings(int n) {
    return '$n активных объявлений';
  }

  @override
  String get notifications => 'Уведомления';

  @override
  String get language => 'Язык';

  @override
  String get appearance => 'Внешний вид';

  @override
  String get themeSystem => 'Как в системе';

  @override
  String get themeLight => 'Светлая';

  @override
  String get themeDark => 'Тёмная';

  @override
  String get privacy => 'Конфиденциальность';

  @override
  String get security => 'Безопасность';

  @override
  String get sessions => 'Активные сессии';

  @override
  String get revokeAll => 'Выйти на всех устройствах';

  @override
  String get help => 'Помощь';

  @override
  String get helpQ1 => 'Как подтвердить, что вещь моя?';

  @override
  String get helpA1 =>
      'Подайте заявку и опишите то, чего не видно на фото: гравировку, содержимое, дефект. Нашедший сравнит это со скрытыми признаками.';

  @override
  String get helpQ2 => 'Почему чат не открывается сразу?';

  @override
  String get helpA2 =>
      'Чат появляется только после того, как автор объявления признает заявку правдоподобной. Это защищает от мошенников.';

  @override
  String get helpQ3 => 'Берёт ли платформа деньги за возврат?';

  @override
  String get helpA3 =>
      'Нет. Вознаграждение — личная договорённость сторон. Приложение не хранит и не переводит деньги.';

  @override
  String get helpQ4 => 'Что делать с найденными документами или картами?';

  @override
  String get helpA4 =>
      'Не публикуйте фото и номера. Опишите тип документа и передайте его в банк или официальную организацию.';

  @override
  String get aboutApp => 'О приложении';

  @override
  String versionLabel(String v) {
    return 'Версия $v';
  }

  @override
  String get deleteAccount => 'Удалить аккаунт';

  @override
  String get deleteAccountConfirm =>
      'Аккаунт будет обезличен, контакты и сессии удалены, объявления закрыты. Это действие необратимо.';

  @override
  String get logout => 'Выйти';

  @override
  String get publicName => 'Имя в приложении';

  @override
  String get save => 'Сохранить';

  @override
  String get cancel => 'Отмена';

  @override
  String get delete => 'Удалить';

  @override
  String get close => 'Закрыть';

  @override
  String get done => 'Готово';

  @override
  String get optional => 'необязательно';

  @override
  String get notifMatches => 'Похожие находки';

  @override
  String get notifMessages => 'Сообщения';

  @override
  String get privacyBody =>
      'Мы показываем только примерный район, удаляем метаданные фото, скрываем контакты и храним скрытые признаки отдельно. Чат защищён на сервере; сквозного шифрования нет.';

  @override
  String get notificationsEmpty => 'Уведомлений пока нет';

  @override
  String get markAllRead => 'Прочитать все';

  @override
  String get reportTitle => 'Жалоба';

  @override
  String get reportReasonFraud => 'Мошенничество';

  @override
  String get reportReasonSpam => 'Спам';

  @override
  String get reportReasonInappropriate => 'Неприемлемый контент';

  @override
  String get reportReasonPersonalData => 'Личные данные';

  @override
  String get reportReasonWrongCategory => 'Неверная категория';

  @override
  String get reportReasonHarassment => 'Преследование';

  @override
  String get reportReasonOther => 'Другое';

  @override
  String get reportDetails => 'Подробности (необязательно)';

  @override
  String get reportSent => 'Жалоба отправлена. Спасибо!';

  @override
  String get colorBlack => 'Чёрный';

  @override
  String get colorWhite => 'Белый';

  @override
  String get colorGray => 'Серый';

  @override
  String get colorRed => 'Красный';

  @override
  String get colorOrange => 'Оранжевый';

  @override
  String get colorYellow => 'Жёлтый';

  @override
  String get colorGreen => 'Зелёный';

  @override
  String get colorBlue => 'Синий';

  @override
  String get colorPurple => 'Фиолетовый';

  @override
  String get colorPink => 'Розовый';

  @override
  String get colorBrown => 'Коричневый';

  @override
  String get colorBeige => 'Бежевый';

  @override
  String get colorGold => 'Золотой';

  @override
  String get colorSilver => 'Серебряный';

  @override
  String get colorMulticolor => 'Разноцветный';

  @override
  String get justNow => 'только что';

  @override
  String minutesAgo(int n) {
    return '$n мин назад';
  }

  @override
  String hoursAgo(int n) {
    return '$n ч назад';
  }

  @override
  String daysAgo(int n) {
    return '$n дн назад';
  }

  @override
  String get aiAnalyzing => 'Распознаём вещь на фото…';

  @override
  String get aiAnalyzingBody =>
      'AI определит категорию, цвет, бренд и модель и заполнит описание';

  @override
  String aiFilled(String fields) {
    return 'AI заполнил: $fields. Проверьте и при необходимости исправьте';
  }

  @override
  String get aiTitle => 'название';

  @override
  String get aiPhotoHint =>
      'Фото размытое или тёмное — переснимите при хорошем свете, чтобы AI заполнил больше полей';

  @override
  String get phoneForListing => 'Ваш телефон';

  @override
  String get phoneListingNote =>
      'В объявлении номер скрыт. Его увидит только человек, чью заявку на вещь вы одобрите.';

  @override
  String get phoneRequired => 'Укажите номер телефона';

  @override
  String get locationRequired =>
      'Выберите район, где вещь была найдена или потеряна';

  @override
  String get editDetails => 'Изменить описание';

  @override
  String aiRecognized(String item) {
    return 'AI распознал: $item';
  }

  @override
  String get contactPhoneTitle => 'Телефон для связи';

  @override
  String get copyPhone => 'Скопировать номер';

  @override
  String get phoneCopied => 'Номер скопирован';

  @override
  String get aiResultTitle => 'AI распознал';

  @override
  String get aiResultHint => 'Нажмите на поле, чтобы исправить';

  @override
  String get aiResultUnsure =>
      'Не удалось уверенно определить вещь — выберите категорию на следующем шаге';

  @override
  String aiMaybe(String category) {
    return 'Возможно: $category';
  }

  @override
  String get aiFromText => 'Подобрано по описанию';

  @override
  String get chooseCategory => 'Выберите категорию';

  @override
  String get chooseColor => 'Выберите цвет';

  @override
  String get notSet => 'не указано';

  @override
  String get publishConsent =>
      'Нажимая «Опубликовать», вы принимаете правила публикации и подтверждаете, что не размещаете чужие личные данные.';

  @override
  String get homeEmptyRecent => 'Пока здесь пусто — опубликуйте первую находку';

  @override
  String get locateButton => 'Определить по местоположению';

  @override
  String locateDone(String area) {
    return 'Район определён: $area. Можно поменять ниже.';
  }

  @override
  String get locateDenied =>
      'Нет доступа к местоположению — выберите район вручную.';

  @override
  String get locateNotFound =>
      'Рядом нет известных районов — выберите вручную.';

  @override
  String get locateFailed =>
      'Не удалось определить местоположение — выберите район вручную.';

  @override
  String get scamTitle => 'Как обманывают и как защититься';

  @override
  String get scam1t => '«Я нашёл вашу вещь, переведите за доставку»';

  @override
  String get scam1d =>
      'Настоящий нашедший не просит денег заранее. Попросите назвать скрытый признак и встретьтесь лично.';

  @override
  String get scam2t => '«Это моя вещь», но признаки назвать не может';

  @override
  String get scam2d =>
      'Настоящий владелец назовёт то, чего нет в объявлении. Не отдавайте вещь без проверки.';

  @override
  String get scam3t => '«Назовите код из СМС»';

  @override
  String get scam3d =>
      'Так крадут деньги и аккаунты. Для возврата вещи не нужны ни коды, ни PIN, ни данные карты.';

  @override
  String get scam4t => '«Я сотрудник Табылды»';

  @override
  String get scam4d =>
      'Табылды не звонит и не просит денег или данных. Не верьте таким звонкам.';

  @override
  String get scam5t => '«Верну только за деньги»';

  @override
  String get scam5d =>
      'Не соглашайтесь и пожалуйтесь на объявление. Если угрожают — звоните 102.';

  @override
  String get scamHelp =>
      'Если вас обманули: пожалуйтесь на объявление или собеседника, сохраните переписку и обратитесь в милицию (102).';

  @override
  String get english => 'English';

  @override
  String get commentsTitle => 'Комментарии';

  @override
  String commentsCount(int n) {
    return 'Комментарии · $n';
  }

  @override
  String get commentsEmpty =>
      'Комментариев пока нет. Видели эту вещь или знаете, где она? Напишите.';

  @override
  String get commentHint => 'Написать комментарий…';

  @override
  String get commentRules =>
      'Комментарии видят все. Не пишите телефоны, адреса и скрытые признаки вещи — для связи есть заявка.';

  @override
  String get commentByOwner => 'Автор объявления';

  @override
  String get commentDelete => 'Удалить комментарий';

  @override
  String get commentDeleted => 'Комментарий удалён';

  @override
  String get commentsClosed =>
      'Объявление закрыто — новые комментарии оставить нельзя.';

  @override
  String get notifComments => 'Комментарии к моим объявлениям';

  @override
  String get contactUs => 'Связаться с нами';

  @override
  String get contactUsSubtitle => 'Идеи, проблемы и отзывы о приложении';

  @override
  String get feedbackIntro =>
      'Расскажите, что улучшить, что не работает или что понравилось. Команда читает каждое сообщение.';

  @override
  String get feedbackKind => 'Тема';

  @override
  String get feedbackIdea => 'Идея';

  @override
  String get feedbackProblem => 'Проблема';

  @override
  String get feedbackPraise => 'Благодарность';

  @override
  String get feedbackQuestion => 'Вопрос';

  @override
  String get feedbackOther => 'Другое';

  @override
  String get feedbackRating => 'Оценка приложения';

  @override
  String get feedbackMessage => 'Сообщение';

  @override
  String get feedbackMessageHint => 'Например: добавьте фильтр по дате';

  @override
  String get feedbackMessageRequired => 'Напишите хотя бы несколько слов';

  @override
  String get feedbackContact => 'Как с вами связаться (необязательно)';

  @override
  String get feedbackContactHint => 'Телефон, email или Telegram';

  @override
  String get feedbackSent => 'Спасибо! Сообщение отправлено команде.';

  @override
  String get helpQ5 => 'Есть ли в приложении чат?';

  @override
  String get helpA5 =>
      'Да. Личный чат открывается между нашедшим и владельцем, когда автор объявления подтвердит заявку, — так мошенники не могут писать всем подряд. А под каждым объявлением можно оставлять открытые комментарии.';
}
