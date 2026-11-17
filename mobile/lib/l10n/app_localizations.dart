import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_ky.dart';
import 'app_localizations_ru.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('ky'),
    Locale('ru'),
  ];

  /// No description provided for @appName.
  ///
  /// In ru, this message translates to:
  /// **'Табылды'**
  String get appName;

  /// No description provided for @tagline.
  ///
  /// In ru, this message translates to:
  /// **'Нашёл — опубликовал. Потерял — нашёл.'**
  String get tagline;

  /// No description provided for @onboarding1Title.
  ///
  /// In ru, this message translates to:
  /// **'Потерянное может найтись'**
  String get onboarding1Title;

  /// No description provided for @onboarding1Body.
  ///
  /// In ru, this message translates to:
  /// **'Единое место, где встречаются те, кто потерял, и те, кто нашёл.'**
  String get onboarding1Body;

  /// No description provided for @onboarding2Title.
  ///
  /// In ru, this message translates to:
  /// **'Нашли вещь? Помогите вернуть'**
  String get onboarding2Title;

  /// No description provided for @onboarding2Body.
  ///
  /// In ru, this message translates to:
  /// **'Сфотографируйте находку — объявление будет готово за минуту.'**
  String get onboarding2Body;

  /// No description provided for @onboarding3Title.
  ///
  /// In ru, this message translates to:
  /// **'Общайтесь безопасно'**
  String get onboarding3Title;

  /// No description provided for @onboarding3Body.
  ///
  /// In ru, this message translates to:
  /// **'Защищённый чат и проверка владельца оберегают от мошенников.'**
  String get onboarding3Body;

  /// No description provided for @continueLabel.
  ///
  /// In ru, this message translates to:
  /// **'Продолжить'**
  String get continueLabel;

  /// No description provided for @skip.
  ///
  /// In ru, this message translates to:
  /// **'Пропустить'**
  String get skip;

  /// No description provided for @chooseLanguage.
  ///
  /// In ru, this message translates to:
  /// **'Выбрать язык'**
  String get chooseLanguage;

  /// No description provided for @languageSheetTitle.
  ///
  /// In ru, this message translates to:
  /// **'Язык приложения'**
  String get languageSheetTitle;

  /// No description provided for @russian.
  ///
  /// In ru, this message translates to:
  /// **'Русский'**
  String get russian;

  /// No description provided for @kyrgyz.
  ///
  /// In ru, this message translates to:
  /// **'Кыргызча'**
  String get kyrgyz;

  /// No description provided for @getStarted.
  ///
  /// In ru, this message translates to:
  /// **'Начать'**
  String get getStarted;

  /// No description provided for @navHome.
  ///
  /// In ru, this message translates to:
  /// **'Главная'**
  String get navHome;

  /// No description provided for @navLost.
  ///
  /// In ru, this message translates to:
  /// **'Потеряно'**
  String get navLost;

  /// No description provided for @navCamera.
  ///
  /// In ru, this message translates to:
  /// **'Я нашёл'**
  String get navCamera;

  /// No description provided for @navFound.
  ///
  /// In ru, this message translates to:
  /// **'Найдено'**
  String get navFound;

  /// No description provided for @navProfile.
  ///
  /// In ru, this message translates to:
  /// **'Профиль'**
  String get navProfile;

  /// No description provided for @homeGreeting.
  ///
  /// In ru, this message translates to:
  /// **'Здравствуйте!'**
  String get homeGreeting;

  /// No description provided for @homeGreetingName.
  ///
  /// In ru, this message translates to:
  /// **'Здравствуйте, {name}!'**
  String homeGreetingName(String name);

  /// No description provided for @homeGreetingGuest.
  ///
  /// In ru, this message translates to:
  /// **'Добро пожаловать'**
  String get homeGreetingGuest;

  /// No description provided for @homeSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Поможем вернуть потерянное'**
  String get homeSubtitle;

  /// No description provided for @searchHint.
  ///
  /// In ru, this message translates to:
  /// **'Что ищете? Например, кошелёк'**
  String get searchHint;

  /// No description provided for @iLost.
  ///
  /// In ru, this message translates to:
  /// **'Я потерял'**
  String get iLost;

  /// No description provided for @iFound.
  ///
  /// In ru, this message translates to:
  /// **'Я нашёл'**
  String get iFound;

  /// No description provided for @homeHeroLostBody.
  ///
  /// In ru, this message translates to:
  /// **'Опишите — найдём похожие'**
  String get homeHeroLostBody;

  /// No description provided for @homeHeroFoundBody.
  ///
  /// In ru, this message translates to:
  /// **'Снимите — AI заполнит сам'**
  String get homeHeroFoundBody;

  /// No description provided for @recentItems.
  ///
  /// In ru, this message translates to:
  /// **'Недавно опубликовано'**
  String get recentItems;

  /// No description provided for @nearby.
  ///
  /// In ru, this message translates to:
  /// **'Новые находки рядом'**
  String get nearby;

  /// No description provided for @nearbyIn.
  ///
  /// In ru, this message translates to:
  /// **'Находки: {city}'**
  String nearbyIn(String city);

  /// No description provided for @chooseCity.
  ///
  /// In ru, this message translates to:
  /// **'Выберите город'**
  String get chooseCity;

  /// No description provided for @allCities.
  ///
  /// In ru, this message translates to:
  /// **'Весь Кыргызстан'**
  String get allCities;

  /// No description provided for @nothingNearby.
  ///
  /// In ru, this message translates to:
  /// **'В этом городе пока нет новых находок'**
  String get nothingNearby;

  /// No description provided for @categories.
  ///
  /// In ru, this message translates to:
  /// **'Категории'**
  String get categories;

  /// No description provided for @messages.
  ///
  /// In ru, this message translates to:
  /// **'Сообщения'**
  String get messages;

  /// No description provided for @safetyTipsTitle.
  ///
  /// In ru, this message translates to:
  /// **'Безопасный возврат'**
  String get safetyTipsTitle;

  /// No description provided for @safetyTip1.
  ///
  /// In ru, this message translates to:
  /// **'Не переводите деньги заранее.'**
  String get safetyTip1;

  /// No description provided for @safetyTip2.
  ///
  /// In ru, this message translates to:
  /// **'Не сообщайте коды подтверждения.'**
  String get safetyTip2;

  /// No description provided for @safetyTip3.
  ///
  /// In ru, this message translates to:
  /// **'Встречайтесь в людных общественных местах.'**
  String get safetyTip3;

  /// No description provided for @seeAll.
  ///
  /// In ru, this message translates to:
  /// **'Все'**
  String get seeAll;

  /// No description provided for @lostCatalogTitle.
  ///
  /// In ru, this message translates to:
  /// **'Потерянные вещи'**
  String get lostCatalogTitle;

  /// No description provided for @foundCatalogTitle.
  ///
  /// In ru, this message translates to:
  /// **'Найденные вещи'**
  String get foundCatalogTitle;

  /// No description provided for @filters.
  ///
  /// In ru, this message translates to:
  /// **'Фильтры'**
  String get filters;

  /// No description provided for @sortLabel.
  ///
  /// In ru, this message translates to:
  /// **'Сортировка'**
  String get sortLabel;

  /// No description provided for @sortNewest.
  ///
  /// In ru, this message translates to:
  /// **'Сначала новые'**
  String get sortNewest;

  /// No description provided for @sortRelevance.
  ///
  /// In ru, this message translates to:
  /// **'По релевантности'**
  String get sortRelevance;

  /// No description provided for @apply.
  ///
  /// In ru, this message translates to:
  /// **'Применить'**
  String get apply;

  /// No description provided for @reset.
  ///
  /// In ru, this message translates to:
  /// **'Сбросить'**
  String get reset;

  /// No description provided for @category.
  ///
  /// In ru, this message translates to:
  /// **'Категория'**
  String get category;

  /// No description provided for @allCategories.
  ///
  /// In ru, this message translates to:
  /// **'Все категории'**
  String get allCategories;

  /// No description provided for @color.
  ///
  /// In ru, this message translates to:
  /// **'Цвет'**
  String get color;

  /// No description provided for @district.
  ///
  /// In ru, this message translates to:
  /// **'Район'**
  String get district;

  /// No description provided for @city.
  ///
  /// In ru, this message translates to:
  /// **'Город'**
  String get city;

  /// No description provided for @anyOption.
  ///
  /// In ru, this message translates to:
  /// **'Любой'**
  String get anyOption;

  /// No description provided for @withReward.
  ///
  /// In ru, this message translates to:
  /// **'С вознаграждением'**
  String get withReward;

  /// No description provided for @details.
  ///
  /// In ru, this message translates to:
  /// **'Подробнее'**
  String get details;

  /// No description provided for @maybeIFoundIt.
  ///
  /// In ru, this message translates to:
  /// **'Возможно, я нашёл это'**
  String get maybeIFoundIt;

  /// No description provided for @thisIsMine.
  ///
  /// In ru, this message translates to:
  /// **'Это моя вещь'**
  String get thisIsMine;

  /// No description provided for @emptySearch.
  ///
  /// In ru, this message translates to:
  /// **'По вашему запросу пока ничего не найдено'**
  String get emptySearch;

  /// No description provided for @changeFilters.
  ///
  /// In ru, this message translates to:
  /// **'Изменить фильтры'**
  String get changeFilters;

  /// No description provided for @createListing.
  ///
  /// In ru, this message translates to:
  /// **'Создать объявление'**
  String get createListing;

  /// No description provided for @recentSearches.
  ///
  /// In ru, this message translates to:
  /// **'Недавние запросы'**
  String get recentSearches;

  /// No description provided for @clearRecent.
  ///
  /// In ru, this message translates to:
  /// **'Очистить'**
  String get clearRecent;

  /// No description provided for @suggestions.
  ///
  /// In ru, this message translates to:
  /// **'Подсказки'**
  String get suggestions;

  /// No description provided for @resultsCount.
  ///
  /// In ru, this message translates to:
  /// **'{n} объявлений'**
  String resultsCount(int n);

  /// No description provided for @endOfList.
  ///
  /// In ru, this message translates to:
  /// **'Это все объявления'**
  String get endOfList;

  /// No description provided for @retry.
  ///
  /// In ru, this message translates to:
  /// **'Повторить'**
  String get retry;

  /// No description provided for @errorGeneric.
  ///
  /// In ru, this message translates to:
  /// **'Что-то пошло не так'**
  String get errorGeneric;

  /// No description provided for @offlineBanner.
  ///
  /// In ru, this message translates to:
  /// **'Нет подключения. Показаны сохранённые данные.'**
  String get offlineBanner;

  /// No description provided for @loading.
  ///
  /// In ru, this message translates to:
  /// **'Загрузка…'**
  String get loading;

  /// No description provided for @contentRemoved.
  ///
  /// In ru, this message translates to:
  /// **'Объявление удалено модерацией'**
  String get contentRemoved;

  /// No description provided for @itemUnavailable.
  ///
  /// In ru, this message translates to:
  /// **'Объявление недоступно'**
  String get itemUnavailable;

  /// No description provided for @accessDenied.
  ///
  /// In ru, this message translates to:
  /// **'Нет доступа'**
  String get accessDenied;

  /// No description provided for @statusPublished.
  ///
  /// In ru, this message translates to:
  /// **'Опубликовано'**
  String get statusPublished;

  /// No description provided for @statusPendingReview.
  ///
  /// In ru, this message translates to:
  /// **'На проверке'**
  String get statusPendingReview;

  /// No description provided for @statusResolved.
  ///
  /// In ru, this message translates to:
  /// **'Возвращено'**
  String get statusResolved;

  /// No description provided for @statusClosed.
  ///
  /// In ru, this message translates to:
  /// **'Закрыто'**
  String get statusClosed;

  /// No description provided for @statusRemoved.
  ///
  /// In ru, this message translates to:
  /// **'Удалено'**
  String get statusRemoved;

  /// No description provided for @statusDraft.
  ///
  /// In ru, this message translates to:
  /// **'Черновик'**
  String get statusDraft;

  /// No description provided for @statusHintPending.
  ///
  /// In ru, this message translates to:
  /// **'Объявление проверяет модератор. Пока его видите только вы.'**
  String get statusHintPending;

  /// No description provided for @lostLabel.
  ///
  /// In ru, this message translates to:
  /// **'Потеряно'**
  String get lostLabel;

  /// No description provided for @foundLabel.
  ///
  /// In ru, this message translates to:
  /// **'Найдено'**
  String get foundLabel;

  /// No description provided for @reward.
  ///
  /// In ru, this message translates to:
  /// **'Вознаграждение'**
  String get reward;

  /// No description provided for @rewardAmount.
  ///
  /// In ru, this message translates to:
  /// **'{amount} сом'**
  String rewardAmount(String amount);

  /// No description provided for @description.
  ///
  /// In ru, this message translates to:
  /// **'Описание'**
  String get description;

  /// No description provided for @visibleFeatures.
  ///
  /// In ru, this message translates to:
  /// **'Видимые характеристики'**
  String get visibleFeatures;

  /// No description provided for @brand.
  ///
  /// In ru, this message translates to:
  /// **'Бренд'**
  String get brand;

  /// No description provided for @size.
  ///
  /// In ru, this message translates to:
  /// **'Размер'**
  String get size;

  /// No description provided for @date.
  ///
  /// In ru, this message translates to:
  /// **'Дата'**
  String get date;

  /// No description provided for @approximateArea.
  ///
  /// In ru, this message translates to:
  /// **'Примерный район'**
  String get approximateArea;

  /// No description provided for @postedBy.
  ///
  /// In ru, this message translates to:
  /// **'Разместил'**
  String get postedBy;

  /// No description provided for @contactHidden.
  ///
  /// In ru, this message translates to:
  /// **'Контакты скрыты. Общение откроется после подтверждения заявки.'**
  String get contactHidden;

  /// No description provided for @trustGuest.
  ///
  /// In ru, this message translates to:
  /// **'Гость'**
  String get trustGuest;

  /// No description provided for @trustContactVerified.
  ///
  /// In ru, this message translates to:
  /// **'Контакт подтверждён'**
  String get trustContactVerified;

  /// No description provided for @trustEstablished.
  ///
  /// In ru, this message translates to:
  /// **'Надёжный участник'**
  String get trustEstablished;

  /// No description provided for @report.
  ///
  /// In ru, this message translates to:
  /// **'Пожаловаться'**
  String get report;

  /// No description provided for @share.
  ///
  /// In ru, this message translates to:
  /// **'Поделиться'**
  String get share;

  /// No description provided for @linkCopied.
  ///
  /// In ru, this message translates to:
  /// **'Ссылка скопирована'**
  String get linkCopied;

  /// No description provided for @edit.
  ///
  /// In ru, this message translates to:
  /// **'Редактировать'**
  String get edit;

  /// No description provided for @moreActions.
  ///
  /// In ru, this message translates to:
  /// **'Ещё'**
  String get moreActions;

  /// No description provided for @ownerPanelTitle.
  ///
  /// In ru, this message translates to:
  /// **'Управление объявлением'**
  String get ownerPanelTitle;

  /// No description provided for @viewMatches.
  ///
  /// In ru, this message translates to:
  /// **'Совпадения'**
  String get viewMatches;

  /// No description provided for @viewClaims.
  ///
  /// In ru, this message translates to:
  /// **'Заявки'**
  String get viewClaims;

  /// No description provided for @pendingClaimsCount.
  ///
  /// In ru, this message translates to:
  /// **'{n} новых'**
  String pendingClaimsCount(int n);

  /// No description provided for @markResolved.
  ///
  /// In ru, this message translates to:
  /// **'Вещь возвращена'**
  String get markResolved;

  /// No description provided for @closeListing.
  ///
  /// In ru, this message translates to:
  /// **'Закрыть объявление'**
  String get closeListing;

  /// No description provided for @matchesTitle.
  ///
  /// In ru, this message translates to:
  /// **'Возможно, мы нашли похожие вещи'**
  String get matchesTitle;

  /// No description provided for @matchesEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Пока совпадений нет. Мы сообщим, когда появятся.'**
  String get matchesEmpty;

  /// No description provided for @matchWhy.
  ///
  /// In ru, this message translates to:
  /// **'Почему мы это предлагаем'**
  String get matchWhy;

  /// No description provided for @matchDisclaimer.
  ///
  /// In ru, this message translates to:
  /// **'Совпадение не доказывает принадлежность. Проверьте скрытые признаки через заявку.'**
  String get matchDisclaimer;

  /// No description provided for @check.
  ///
  /// In ru, this message translates to:
  /// **'Проверить'**
  String get check;

  /// No description provided for @dismiss.
  ///
  /// In ru, this message translates to:
  /// **'Скрыть'**
  String get dismiss;

  /// No description provided for @noPhotoRestricted.
  ///
  /// In ru, this message translates to:
  /// **'Фото для этой категории не публикуется ради безопасности.'**
  String get noPhotoRestricted;

  /// No description provided for @foundFlowTitle.
  ///
  /// In ru, this message translates to:
  /// **'Новая находка'**
  String get foundFlowTitle;

  /// No description provided for @lostFlowTitle.
  ///
  /// In ru, this message translates to:
  /// **'Что вы потеряли?'**
  String get lostFlowTitle;

  /// No description provided for @stepOf.
  ///
  /// In ru, this message translates to:
  /// **'Шаг {n} из {total}'**
  String stepOf(int n, int total);

  /// No description provided for @back.
  ///
  /// In ru, this message translates to:
  /// **'Назад'**
  String get back;

  /// No description provided for @next.
  ///
  /// In ru, this message translates to:
  /// **'Далее'**
  String get next;

  /// No description provided for @stepPhoto.
  ///
  /// In ru, this message translates to:
  /// **'Фото'**
  String get stepPhoto;

  /// No description provided for @stepDetails.
  ///
  /// In ru, this message translates to:
  /// **'Описание'**
  String get stepDetails;

  /// No description provided for @stepPlace.
  ///
  /// In ru, this message translates to:
  /// **'Где и когда'**
  String get stepPlace;

  /// No description provided for @stepHidden.
  ///
  /// In ru, this message translates to:
  /// **'Скрытые признаки'**
  String get stepHidden;

  /// No description provided for @stepReview.
  ///
  /// In ru, this message translates to:
  /// **'Проверка'**
  String get stepReview;

  /// No description provided for @photoStepTitle.
  ///
  /// In ru, this message translates to:
  /// **'Сфотографируйте находку'**
  String get photoStepTitle;

  /// No description provided for @photoStepBody.
  ///
  /// In ru, this message translates to:
  /// **'Снимите вещь целиком на нейтральном фоне. Документы, карты и ключи крупным планом не публикуются.'**
  String get photoStepBody;

  /// No description provided for @takePhoto.
  ///
  /// In ru, this message translates to:
  /// **'Сделать фото'**
  String get takePhoto;

  /// No description provided for @pickFromGallery.
  ///
  /// In ru, this message translates to:
  /// **'Выбрать из галереи'**
  String get pickFromGallery;

  /// No description provided for @retakePhoto.
  ///
  /// In ru, this message translates to:
  /// **'Переснять'**
  String get retakePhoto;

  /// No description provided for @removePhoto.
  ///
  /// In ru, this message translates to:
  /// **'Удалить фото'**
  String get removePhoto;

  /// No description provided for @photoTaken.
  ///
  /// In ru, this message translates to:
  /// **'Фото добавлено'**
  String get photoTaken;

  /// No description provided for @noPhotoHint.
  ///
  /// In ru, this message translates to:
  /// **'Фото необязательно'**
  String get noPhotoHint;

  /// No description provided for @cameraPermissionTitle.
  ///
  /// In ru, this message translates to:
  /// **'Нужен доступ к камере'**
  String get cameraPermissionTitle;

  /// No description provided for @cameraPermissionBody.
  ///
  /// In ru, this message translates to:
  /// **'Камера нужна только чтобы сфотографировать найденную вещь. Можно выбрать фото из галереи.'**
  String get cameraPermissionBody;

  /// No description provided for @continueWithoutPhoto.
  ///
  /// In ru, this message translates to:
  /// **'Продолжить без фото'**
  String get continueWithoutPhoto;

  /// No description provided for @photoProcessing.
  ///
  /// In ru, this message translates to:
  /// **'Обрабатываем фото…'**
  String get photoProcessing;

  /// No description provided for @photoBlocked.
  ///
  /// In ru, this message translates to:
  /// **'На фото обнаружены конфиденциальные данные. Такое изображение нельзя публиковать.'**
  String get photoBlocked;

  /// No description provided for @photoUnchecked.
  ///
  /// In ru, this message translates to:
  /// **'Фото проверит модератор, после этого объявление появится в ленте — обычно в течение нескольких часов.'**
  String get photoUnchecked;

  /// No description provided for @aiSuggestionsTitle.
  ///
  /// In ru, this message translates to:
  /// **'AI-подсказки'**
  String get aiSuggestionsTitle;

  /// No description provided for @aiSuggestionsOff.
  ///
  /// In ru, this message translates to:
  /// **'Подсказки отключены'**
  String get aiSuggestionsOff;

  /// No description provided for @aiSuggestionsApplied.
  ///
  /// In ru, this message translates to:
  /// **'Подсказки применены — проверьте и исправьте при необходимости'**
  String get aiSuggestionsApplied;

  /// No description provided for @aiNotSure.
  ///
  /// In ru, this message translates to:
  /// **'Категория, цвет и название — по фото'**
  String get aiNotSure;

  /// No description provided for @useSuggestion.
  ///
  /// In ru, this message translates to:
  /// **'Применить'**
  String get useSuggestion;

  /// No description provided for @detailsStepTitle.
  ///
  /// In ru, this message translates to:
  /// **'Опишите вещь'**
  String get detailsStepTitle;

  /// No description provided for @whereWhenTitle.
  ///
  /// In ru, this message translates to:
  /// **'Где и когда'**
  String get whereWhenTitle;

  /// No description provided for @lostAttributesTitle.
  ///
  /// In ru, this message translates to:
  /// **'Как она выглядит'**
  String get lostAttributesTitle;

  /// No description provided for @hiddenStepTitle.
  ///
  /// In ru, this message translates to:
  /// **'Скрытые признаки'**
  String get hiddenStepTitle;

  /// No description provided for @reviewStepTitle.
  ///
  /// In ru, this message translates to:
  /// **'Проверьте объявление'**
  String get reviewStepTitle;

  /// No description provided for @titleField.
  ///
  /// In ru, this message translates to:
  /// **'Название'**
  String get titleField;

  /// No description provided for @titleHintFound.
  ///
  /// In ru, this message translates to:
  /// **'Например, Найден чёрный кошелёк'**
  String get titleHintFound;

  /// No description provided for @titleHintLost.
  ///
  /// In ru, this message translates to:
  /// **'Например, Потерял синий рюкзак'**
  String get titleHintLost;

  /// No description provided for @titleRequired.
  ///
  /// In ru, this message translates to:
  /// **'Введите название не короче 3 символов'**
  String get titleRequired;

  /// No description provided for @categoryRequired.
  ///
  /// In ru, this message translates to:
  /// **'Выберите категорию'**
  String get categoryRequired;

  /// No description provided for @descriptionField.
  ///
  /// In ru, this message translates to:
  /// **'Описание (только видимые детали)'**
  String get descriptionField;

  /// No description provided for @colorField.
  ///
  /// In ru, this message translates to:
  /// **'Цвет'**
  String get colorField;

  /// No description provided for @brandField.
  ///
  /// In ru, this message translates to:
  /// **'Бренд (если известен)'**
  String get brandField;

  /// No description provided for @sizeField.
  ///
  /// In ru, this message translates to:
  /// **'Размер (если применимо)'**
  String get sizeField;

  /// No description provided for @areaField.
  ///
  /// In ru, this message translates to:
  /// **'Примерный район'**
  String get areaField;

  /// No description provided for @chooseArea.
  ///
  /// In ru, this message translates to:
  /// **'Выберите район'**
  String get chooseArea;

  /// No description provided for @dateField.
  ///
  /// In ru, this message translates to:
  /// **'Когда'**
  String get dateField;

  /// No description provided for @dateRangeApprox.
  ///
  /// In ru, this message translates to:
  /// **'Дата может быть приблизительной'**
  String get dateRangeApprox;

  /// No description provided for @today.
  ///
  /// In ru, this message translates to:
  /// **'Сегодня'**
  String get today;

  /// No description provided for @yesterday.
  ///
  /// In ru, this message translates to:
  /// **'Вчера'**
  String get yesterday;

  /// No description provided for @hiddenFeaturesTitle.
  ///
  /// In ru, this message translates to:
  /// **'Скрытые признаки'**
  String get hiddenFeaturesTitle;

  /// No description provided for @hiddenFeaturesHelp.
  ///
  /// In ru, this message translates to:
  /// **'Детали, которые знает только владелец: гравировка, содержимое, царапина. Они не показываются в объявлении и нужны для проверки заявок.'**
  String get hiddenFeaturesHelp;

  /// No description provided for @hiddenFeatureHint.
  ///
  /// In ru, this message translates to:
  /// **'Например, царапина на замке'**
  String get hiddenFeatureHint;

  /// No description provided for @addFeature.
  ///
  /// In ru, this message translates to:
  /// **'Добавить признак'**
  String get addFeature;

  /// No description provided for @rewardField.
  ///
  /// In ru, this message translates to:
  /// **'Вознаграждение (необязательно)'**
  String get rewardField;

  /// No description provided for @rewardNote.
  ///
  /// In ru, this message translates to:
  /// **'Комментарий к вознаграждению'**
  String get rewardNote;

  /// No description provided for @rewardDisclaimer.
  ///
  /// In ru, this message translates to:
  /// **'Платформа не хранит и не переводит деньги.'**
  String get rewardDisclaimer;

  /// No description provided for @notifyMatches.
  ///
  /// In ru, this message translates to:
  /// **'Сообщать о похожих находках'**
  String get notifyMatches;

  /// No description provided for @acceptRules.
  ///
  /// In ru, this message translates to:
  /// **'Я принимаю правила публикации и не размещаю чужие личные данные'**
  String get acceptRules;

  /// No description provided for @preview.
  ///
  /// In ru, this message translates to:
  /// **'Так объявление увидят другие'**
  String get preview;

  /// No description provided for @publish.
  ///
  /// In ru, this message translates to:
  /// **'Опубликовать'**
  String get publish;

  /// No description provided for @publishing.
  ///
  /// In ru, this message translates to:
  /// **'Публикуем…'**
  String get publishing;

  /// No description provided for @successFoundTitle.
  ///
  /// In ru, this message translates to:
  /// **'Спасибо! Вы помогаете вернуть потерянную вещь'**
  String get successFoundTitle;

  /// No description provided for @successLostTitle.
  ///
  /// In ru, this message translates to:
  /// **'Объявление опубликовано'**
  String get successLostTitle;

  /// No description provided for @successPendingReview.
  ///
  /// In ru, this message translates to:
  /// **'Объявление отправлено на проверку. Обычно это занимает до нескольких часов.'**
  String get successPendingReview;

  /// No description provided for @viewListing.
  ///
  /// In ru, this message translates to:
  /// **'Посмотреть объявление'**
  String get viewListing;

  /// No description provided for @toHome.
  ///
  /// In ru, this message translates to:
  /// **'На главную'**
  String get toHome;

  /// No description provided for @draftSaved.
  ///
  /// In ru, this message translates to:
  /// **'Черновик сохранён'**
  String get draftSaved;

  /// No description provided for @draftRestore.
  ///
  /// In ru, this message translates to:
  /// **'Продолжить черновик?'**
  String get draftRestore;

  /// No description provided for @draftRestoreBody.
  ///
  /// In ru, this message translates to:
  /// **'У вас есть незавершённое объявление. Основные поля сохранены.'**
  String get draftRestoreBody;

  /// No description provided for @continueDraft.
  ///
  /// In ru, this message translates to:
  /// **'Продолжить'**
  String get continueDraft;

  /// No description provided for @startOver.
  ///
  /// In ru, this message translates to:
  /// **'Начать заново'**
  String get startOver;

  /// No description provided for @matchesFoundCount.
  ///
  /// In ru, this message translates to:
  /// **'{count} похожих находок'**
  String matchesFoundCount(int count);

  /// No description provided for @sensitiveCategoryTitle.
  ///
  /// In ru, this message translates to:
  /// **'Особая категория'**
  String get sensitiveCategoryTitle;

  /// No description provided for @sensitiveDocuments.
  ///
  /// In ru, this message translates to:
  /// **'Документы: не публикуйте номера и фото. Опишите тип документа, имя на нём не указывайте — владелец подтвердит его сам.'**
  String get sensitiveDocuments;

  /// No description provided for @sensitiveBankCards.
  ///
  /// In ru, this message translates to:
  /// **'Банковские карты: не фотографируйте и не указывайте номер. Рекомендуем передать карту в банк.'**
  String get sensitiveBankCards;

  /// No description provided for @sensitiveKeys.
  ///
  /// In ru, this message translates to:
  /// **'Ключи: не публикуйте фото профиля ключа и не указывайте адрес.'**
  String get sensitiveKeys;

  /// No description provided for @sensitivePhones.
  ///
  /// In ru, this message translates to:
  /// **'Телефоны: не публикуйте IMEI и не пытайтесь разблокировать устройство.'**
  String get sensitivePhones;

  /// No description provided for @authTitle.
  ///
  /// In ru, this message translates to:
  /// **'Войти или создать аккаунт'**
  String get authTitle;

  /// No description provided for @authBody.
  ///
  /// In ru, this message translates to:
  /// **'Это необязательно. Подтвердите телефон или email, чтобы сохранить свои объявления и переписку и открывать их с любого устройства.'**
  String get authBody;

  /// No description provided for @phone.
  ///
  /// In ru, this message translates to:
  /// **'Телефон'**
  String get phone;

  /// No description provided for @email.
  ///
  /// In ru, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @phoneHint.
  ///
  /// In ru, this message translates to:
  /// **'+996 700 000 000'**
  String get phoneHint;

  /// No description provided for @emailHint.
  ///
  /// In ru, this message translates to:
  /// **'name@example.com'**
  String get emailHint;

  /// No description provided for @sendCode.
  ///
  /// In ru, this message translates to:
  /// **'Получить код'**
  String get sendCode;

  /// No description provided for @codeSentTo.
  ///
  /// In ru, this message translates to:
  /// **'Код отправлен. Введите 6 цифр.'**
  String get codeSentTo;

  /// No description provided for @codeField.
  ///
  /// In ru, this message translates to:
  /// **'Код'**
  String get codeField;

  /// No description provided for @verify.
  ///
  /// In ru, this message translates to:
  /// **'Подтвердить'**
  String get verify;

  /// No description provided for @resendCode.
  ///
  /// In ru, this message translates to:
  /// **'Отправить ещё раз'**
  String get resendCode;

  /// No description provided for @devCodeHint.
  ///
  /// In ru, this message translates to:
  /// **'Код для разработки: {code}'**
  String devCodeHint(String code);

  /// No description provided for @claimTitle.
  ///
  /// In ru, this message translates to:
  /// **'Проверка владельца'**
  String get claimTitle;

  /// No description provided for @claimIntro.
  ///
  /// In ru, this message translates to:
  /// **'Чтобы защитить вещь от мошенников, нам нужно убедиться, что она действительно ваша.'**
  String get claimIntro;

  /// No description provided for @claimFoundReportIntro.
  ///
  /// In ru, this message translates to:
  /// **'Расскажите, что вы нашли и где. Владелец сравнит это со своими скрытыми признаками.'**
  String get claimFoundReportIntro;

  /// No description provided for @claimMessage.
  ///
  /// In ru, this message translates to:
  /// **'Сообщение (без личных данных)'**
  String get claimMessage;

  /// No description provided for @evidenceType.
  ///
  /// In ru, this message translates to:
  /// **'Тип подтверждения'**
  String get evidenceType;

  /// No description provided for @evidenceUniqueFeature.
  ///
  /// In ru, this message translates to:
  /// **'Уникальный признак'**
  String get evidenceUniqueFeature;

  /// No description provided for @evidenceContents.
  ///
  /// In ru, this message translates to:
  /// **'Содержимое'**
  String get evidenceContents;

  /// No description provided for @evidencePurchase.
  ///
  /// In ru, this message translates to:
  /// **'Подтверждение покупки'**
  String get evidencePurchase;

  /// No description provided for @evidenceOldPhoto.
  ///
  /// In ru, this message translates to:
  /// **'Старое фото'**
  String get evidenceOldPhoto;

  /// No description provided for @evidenceOther.
  ///
  /// In ru, this message translates to:
  /// **'Другое'**
  String get evidenceOther;

  /// No description provided for @evidenceText.
  ///
  /// In ru, this message translates to:
  /// **'Описание'**
  String get evidenceText;

  /// No description provided for @addEvidence.
  ///
  /// In ru, this message translates to:
  /// **'Добавить подтверждение'**
  String get addEvidence;

  /// No description provided for @evidenceHint.
  ///
  /// In ru, this message translates to:
  /// **'Опишите то, чего не видно на фото'**
  String get evidenceHint;

  /// No description provided for @submitClaim.
  ///
  /// In ru, this message translates to:
  /// **'Отправить заявку'**
  String get submitClaim;

  /// No description provided for @claimSubmitted.
  ///
  /// In ru, this message translates to:
  /// **'Заявка отправлена. Мы сообщим о решении.'**
  String get claimSubmitted;

  /// No description provided for @myClaims.
  ///
  /// In ru, this message translates to:
  /// **'Мои заявки'**
  String get myClaims;

  /// No description provided for @incomingClaims.
  ///
  /// In ru, this message translates to:
  /// **'Заявки на мои вещи'**
  String get incomingClaims;

  /// No description provided for @claimsEmptyMine.
  ///
  /// In ru, this message translates to:
  /// **'Вы ещё не подавали заявок'**
  String get claimsEmptyMine;

  /// No description provided for @claimsEmptyIncoming.
  ///
  /// In ru, this message translates to:
  /// **'Заявок на ваши вещи пока нет'**
  String get claimsEmptyIncoming;

  /// No description provided for @claimStatusLabel.
  ///
  /// In ru, this message translates to:
  /// **'Статус заявки'**
  String get claimStatusLabel;

  /// No description provided for @claimStatusSubmitted.
  ///
  /// In ru, this message translates to:
  /// **'Отправлена'**
  String get claimStatusSubmitted;

  /// No description provided for @claimStatusScreening.
  ///
  /// In ru, this message translates to:
  /// **'Проверяется'**
  String get claimStatusScreening;

  /// No description provided for @claimStatusNeedsInfo.
  ///
  /// In ru, this message translates to:
  /// **'Нужны уточнения'**
  String get claimStatusNeedsInfo;

  /// No description provided for @claimStatusUnderReview.
  ///
  /// In ru, this message translates to:
  /// **'На рассмотрении модератора'**
  String get claimStatusUnderReview;

  /// No description provided for @claimStatusPlausible.
  ///
  /// In ru, this message translates to:
  /// **'Подтверждена, можно общаться'**
  String get claimStatusPlausible;

  /// No description provided for @claimStatusRejected.
  ///
  /// In ru, this message translates to:
  /// **'Отклонена'**
  String get claimStatusRejected;

  /// No description provided for @claimStatusWithdrawn.
  ///
  /// In ru, this message translates to:
  /// **'Отозвана'**
  String get claimStatusWithdrawn;

  /// No description provided for @claimStatusApprovedHandoff.
  ///
  /// In ru, this message translates to:
  /// **'Готова к передаче'**
  String get claimStatusApprovedHandoff;

  /// No description provided for @claimStatusCompleted.
  ///
  /// In ru, this message translates to:
  /// **'Возврат завершён'**
  String get claimStatusCompleted;

  /// No description provided for @decisionTitle.
  ///
  /// In ru, this message translates to:
  /// **'Ваше решение'**
  String get decisionTitle;

  /// No description provided for @decisionPlausible.
  ///
  /// In ru, this message translates to:
  /// **'Похоже на правду'**
  String get decisionPlausible;

  /// No description provided for @decisionNeedsInfo.
  ///
  /// In ru, this message translates to:
  /// **'Запросить уточнения'**
  String get decisionNeedsInfo;

  /// No description provided for @decisionReject.
  ///
  /// In ru, this message translates to:
  /// **'Отклонить'**
  String get decisionReject;

  /// No description provided for @decisionNote.
  ///
  /// In ru, this message translates to:
  /// **'Комментарий (необязательно)'**
  String get decisionNote;

  /// No description provided for @withdrawClaim.
  ///
  /// In ru, this message translates to:
  /// **'Отозвать заявку'**
  String get withdrawClaim;

  /// No description provided for @openChat.
  ///
  /// In ru, this message translates to:
  /// **'Открыть чат'**
  String get openChat;

  /// No description provided for @yourHiddenFeatures.
  ///
  /// In ru, this message translates to:
  /// **'Ваши скрытые признаки для сравнения'**
  String get yourHiddenFeatures;

  /// No description provided for @evidenceFromClaimant.
  ///
  /// In ru, this message translates to:
  /// **'Подтверждения от заявителя'**
  String get evidenceFromClaimant;

  /// No description provided for @dispute.
  ///
  /// In ru, this message translates to:
  /// **'Оспорить'**
  String get dispute;

  /// No description provided for @claimantLabel.
  ///
  /// In ru, this message translates to:
  /// **'Заявитель'**
  String get claimantLabel;

  /// No description provided for @chatsTitle.
  ///
  /// In ru, this message translates to:
  /// **'Сообщения'**
  String get chatsTitle;

  /// No description provided for @chatsEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Пока нет диалогов. Чат открывается после подтверждения заявки.'**
  String get chatsEmpty;

  /// No description provided for @messageHint.
  ///
  /// In ru, this message translates to:
  /// **'Сообщение…'**
  String get messageHint;

  /// No description provided for @send.
  ///
  /// In ru, this message translates to:
  /// **'Отправить'**
  String get send;

  /// No description provided for @attachPhoto.
  ///
  /// In ru, this message translates to:
  /// **'Прикрепить фото'**
  String get attachPhoto;

  /// No description provided for @systemMessage.
  ///
  /// In ru, this message translates to:
  /// **'Система'**
  String get systemMessage;

  /// No description provided for @connectionLive.
  ///
  /// In ru, this message translates to:
  /// **'онлайн'**
  String get connectionLive;

  /// No description provided for @connectionReconnecting.
  ///
  /// In ru, this message translates to:
  /// **'переподключение…'**
  String get connectionReconnecting;

  /// No description provided for @chatClosedBanner.
  ///
  /// In ru, this message translates to:
  /// **'Диалог завершён'**
  String get chatClosedBanner;

  /// No description provided for @warningAdvancePayment.
  ///
  /// In ru, this message translates to:
  /// **'Собеседник упоминает предоплату. Не переводите деньги до получения вещи.'**
  String get warningAdvancePayment;

  /// No description provided for @warningOtp.
  ///
  /// In ru, this message translates to:
  /// **'Никому не сообщайте коды подтверждения.'**
  String get warningOtp;

  /// No description provided for @warningLink.
  ///
  /// In ru, this message translates to:
  /// **'Будьте осторожны с внешними ссылками.'**
  String get warningLink;

  /// No description provided for @blockUser.
  ///
  /// In ru, this message translates to:
  /// **'Заблокировать'**
  String get blockUser;

  /// No description provided for @closeChat.
  ///
  /// In ru, this message translates to:
  /// **'Завершить диалог'**
  String get closeChat;

  /// No description provided for @handoffActions.
  ///
  /// In ru, this message translates to:
  /// **'Возврат'**
  String get handoffActions;

  /// No description provided for @handoffTitle.
  ///
  /// In ru, this message translates to:
  /// **'Передача вещи'**
  String get handoffTitle;

  /// No description provided for @handoffPropose.
  ///
  /// In ru, this message translates to:
  /// **'Договориться о передаче'**
  String get handoffPropose;

  /// No description provided for @handoffMethodMeeting.
  ///
  /// In ru, this message translates to:
  /// **'Личная встреча'**
  String get handoffMethodMeeting;

  /// No description provided for @handoffMethodOther.
  ///
  /// In ru, this message translates to:
  /// **'Другой способ'**
  String get handoffMethodOther;

  /// No description provided for @handoffPlaceHint.
  ///
  /// In ru, this message translates to:
  /// **'Где встретимся? Выберите людное место'**
  String get handoffPlaceHint;

  /// No description provided for @handoffCreate.
  ///
  /// In ru, this message translates to:
  /// **'Предложить'**
  String get handoffCreate;

  /// No description provided for @handoffStep1.
  ///
  /// In ru, this message translates to:
  /// **'Предложение'**
  String get handoffStep1;

  /// No description provided for @handoffStep2.
  ///
  /// In ru, this message translates to:
  /// **'Ваше подтверждение'**
  String get handoffStep2;

  /// No description provided for @handoffStep3.
  ///
  /// In ru, this message translates to:
  /// **'Подтверждение второй стороны'**
  String get handoffStep3;

  /// No description provided for @handoffStep4.
  ///
  /// In ru, this message translates to:
  /// **'Завершено'**
  String get handoffStep4;

  /// No description provided for @handoffCodeTitle.
  ///
  /// In ru, this message translates to:
  /// **'Код подтверждения'**
  String get handoffCodeTitle;

  /// No description provided for @handoffCodeHolder.
  ///
  /// In ru, this message translates to:
  /// **'Назовите этот код получателю при передаче. Он действует 72 часа.'**
  String get handoffCodeHolder;

  /// No description provided for @handoffCodeReceiver.
  ///
  /// In ru, this message translates to:
  /// **'Введите код, который назовёт вам нашедший'**
  String get handoffCodeReceiver;

  /// No description provided for @handoffCodeExpires.
  ///
  /// In ru, this message translates to:
  /// **'Действует до {time}'**
  String handoffCodeExpires(String time);

  /// No description provided for @handoffConfirm.
  ///
  /// In ru, this message translates to:
  /// **'Подтвердить передачу'**
  String get handoffConfirm;

  /// No description provided for @handoffWaiting.
  ///
  /// In ru, this message translates to:
  /// **'Ждём подтверждения второй стороны'**
  String get handoffWaiting;

  /// No description provided for @handoffCompleted.
  ///
  /// In ru, this message translates to:
  /// **'Возврат подтверждён обеими сторонами. Спасибо!'**
  String get handoffCompleted;

  /// No description provided for @handoffDisclaimer.
  ///
  /// In ru, this message translates to:
  /// **'Код подтверждает действие в приложении, но сам по себе не доказывает право собственности или физическую передачу.'**
  String get handoffDisclaimer;

  /// No description provided for @profileTitle.
  ///
  /// In ru, this message translates to:
  /// **'Профиль'**
  String get profileTitle;

  /// No description provided for @guestProfileBody.
  ///
  /// In ru, this message translates to:
  /// **'Регистрация не нужна: находки можно сразу фотографировать и публиковать. Войдите, когда захотите сохранить объявления и переписку на других устройствах.'**
  String get guestProfileBody;

  /// No description provided for @sectionMine.
  ///
  /// In ru, this message translates to:
  /// **'Моё'**
  String get sectionMine;

  /// No description provided for @sectionSettings.
  ///
  /// In ru, this message translates to:
  /// **'Настройки'**
  String get sectionSettings;

  /// No description provided for @sectionSafety.
  ///
  /// In ru, this message translates to:
  /// **'Безопасность и помощь'**
  String get sectionSafety;

  /// No description provided for @myListings.
  ///
  /// In ru, this message translates to:
  /// **'Мои объявления'**
  String get myListings;

  /// No description provided for @myMessages.
  ///
  /// In ru, this message translates to:
  /// **'Мои сообщения'**
  String get myMessages;

  /// No description provided for @returnsHistory.
  ///
  /// In ru, this message translates to:
  /// **'История возвратов'**
  String get returnsHistory;

  /// No description provided for @returnsEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Завершённых возвратов пока нет'**
  String get returnsEmpty;

  /// No description provided for @activeListings.
  ///
  /// In ru, this message translates to:
  /// **'{n} активных объявлений'**
  String activeListings(int n);

  /// No description provided for @notifications.
  ///
  /// In ru, this message translates to:
  /// **'Уведомления'**
  String get notifications;

  /// No description provided for @language.
  ///
  /// In ru, this message translates to:
  /// **'Язык'**
  String get language;

  /// No description provided for @appearance.
  ///
  /// In ru, this message translates to:
  /// **'Внешний вид'**
  String get appearance;

  /// No description provided for @themeSystem.
  ///
  /// In ru, this message translates to:
  /// **'Как в системе'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In ru, this message translates to:
  /// **'Светлая'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In ru, this message translates to:
  /// **'Тёмная'**
  String get themeDark;

  /// No description provided for @privacy.
  ///
  /// In ru, this message translates to:
  /// **'Конфиденциальность'**
  String get privacy;

  /// No description provided for @security.
  ///
  /// In ru, this message translates to:
  /// **'Безопасность'**
  String get security;

  /// No description provided for @sessions.
  ///
  /// In ru, this message translates to:
  /// **'Активные сессии'**
  String get sessions;

  /// No description provided for @revokeAll.
  ///
  /// In ru, this message translates to:
  /// **'Выйти на всех устройствах'**
  String get revokeAll;

  /// No description provided for @help.
  ///
  /// In ru, this message translates to:
  /// **'Помощь'**
  String get help;

  /// No description provided for @helpQ1.
  ///
  /// In ru, this message translates to:
  /// **'Как подтвердить, что вещь моя?'**
  String get helpQ1;

  /// No description provided for @helpA1.
  ///
  /// In ru, this message translates to:
  /// **'Подайте заявку и опишите то, чего не видно на фото: гравировку, содержимое, дефект. Нашедший сравнит это со скрытыми признаками.'**
  String get helpA1;

  /// No description provided for @helpQ2.
  ///
  /// In ru, this message translates to:
  /// **'Почему чат не открывается сразу?'**
  String get helpQ2;

  /// No description provided for @helpA2.
  ///
  /// In ru, this message translates to:
  /// **'Чат появляется только после того, как автор объявления признает заявку правдоподобной. Это защищает от мошенников.'**
  String get helpA2;

  /// No description provided for @helpQ3.
  ///
  /// In ru, this message translates to:
  /// **'Берёт ли платформа деньги за возврат?'**
  String get helpQ3;

  /// No description provided for @helpA3.
  ///
  /// In ru, this message translates to:
  /// **'Нет. Вознаграждение — личная договорённость сторон. Приложение не хранит и не переводит деньги.'**
  String get helpA3;

  /// No description provided for @helpQ4.
  ///
  /// In ru, this message translates to:
  /// **'Что делать с найденными документами или картами?'**
  String get helpQ4;

  /// No description provided for @helpA4.
  ///
  /// In ru, this message translates to:
  /// **'Не публикуйте фото и номера. Опишите тип документа и передайте его в банк или официальную организацию.'**
  String get helpA4;

  /// No description provided for @aboutApp.
  ///
  /// In ru, this message translates to:
  /// **'О приложении'**
  String get aboutApp;

  /// No description provided for @versionLabel.
  ///
  /// In ru, this message translates to:
  /// **'Версия {v}'**
  String versionLabel(String v);

  /// No description provided for @deleteAccount.
  ///
  /// In ru, this message translates to:
  /// **'Удалить аккаунт'**
  String get deleteAccount;

  /// No description provided for @deleteAccountConfirm.
  ///
  /// In ru, this message translates to:
  /// **'Аккаунт будет обезличен, контакты и сессии удалены, объявления закрыты. Это действие необратимо.'**
  String get deleteAccountConfirm;

  /// No description provided for @logout.
  ///
  /// In ru, this message translates to:
  /// **'Выйти'**
  String get logout;

  /// No description provided for @publicName.
  ///
  /// In ru, this message translates to:
  /// **'Имя в приложении'**
  String get publicName;

  /// No description provided for @save.
  ///
  /// In ru, this message translates to:
  /// **'Сохранить'**
  String get save;

  /// No description provided for @cancel.
  ///
  /// In ru, this message translates to:
  /// **'Отмена'**
  String get cancel;

  /// No description provided for @delete.
  ///
  /// In ru, this message translates to:
  /// **'Удалить'**
  String get delete;

  /// No description provided for @close.
  ///
  /// In ru, this message translates to:
  /// **'Закрыть'**
  String get close;

  /// No description provided for @done.
  ///
  /// In ru, this message translates to:
  /// **'Готово'**
  String get done;

  /// No description provided for @optional.
  ///
  /// In ru, this message translates to:
  /// **'необязательно'**
  String get optional;

  /// No description provided for @notifMatches.
  ///
  /// In ru, this message translates to:
  /// **'Похожие находки'**
  String get notifMatches;

  /// No description provided for @notifMessages.
  ///
  /// In ru, this message translates to:
  /// **'Сообщения'**
  String get notifMessages;

  /// No description provided for @privacyBody.
  ///
  /// In ru, this message translates to:
  /// **'Мы показываем только примерный район, удаляем метаданные фото, скрываем контакты и храним скрытые признаки отдельно. Чат защищён на сервере; сквозного шифрования нет.'**
  String get privacyBody;

  /// No description provided for @notificationsEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Уведомлений пока нет'**
  String get notificationsEmpty;

  /// No description provided for @markAllRead.
  ///
  /// In ru, this message translates to:
  /// **'Прочитать все'**
  String get markAllRead;

  /// No description provided for @reportTitle.
  ///
  /// In ru, this message translates to:
  /// **'Жалоба'**
  String get reportTitle;

  /// No description provided for @reportReasonFraud.
  ///
  /// In ru, this message translates to:
  /// **'Мошенничество'**
  String get reportReasonFraud;

  /// No description provided for @reportReasonSpam.
  ///
  /// In ru, this message translates to:
  /// **'Спам'**
  String get reportReasonSpam;

  /// No description provided for @reportReasonInappropriate.
  ///
  /// In ru, this message translates to:
  /// **'Неприемлемый контент'**
  String get reportReasonInappropriate;

  /// No description provided for @reportReasonPersonalData.
  ///
  /// In ru, this message translates to:
  /// **'Личные данные'**
  String get reportReasonPersonalData;

  /// No description provided for @reportReasonWrongCategory.
  ///
  /// In ru, this message translates to:
  /// **'Неверная категория'**
  String get reportReasonWrongCategory;

  /// No description provided for @reportReasonHarassment.
  ///
  /// In ru, this message translates to:
  /// **'Преследование'**
  String get reportReasonHarassment;

  /// No description provided for @reportReasonOther.
  ///
  /// In ru, this message translates to:
  /// **'Другое'**
  String get reportReasonOther;

  /// No description provided for @reportDetails.
  ///
  /// In ru, this message translates to:
  /// **'Подробности (необязательно)'**
  String get reportDetails;

  /// No description provided for @reportSent.
  ///
  /// In ru, this message translates to:
  /// **'Жалоба отправлена. Спасибо!'**
  String get reportSent;

  /// No description provided for @colorBlack.
  ///
  /// In ru, this message translates to:
  /// **'Чёрный'**
  String get colorBlack;

  /// No description provided for @colorWhite.
  ///
  /// In ru, this message translates to:
  /// **'Белый'**
  String get colorWhite;

  /// No description provided for @colorGray.
  ///
  /// In ru, this message translates to:
  /// **'Серый'**
  String get colorGray;

  /// No description provided for @colorRed.
  ///
  /// In ru, this message translates to:
  /// **'Красный'**
  String get colorRed;

  /// No description provided for @colorOrange.
  ///
  /// In ru, this message translates to:
  /// **'Оранжевый'**
  String get colorOrange;

  /// No description provided for @colorYellow.
  ///
  /// In ru, this message translates to:
  /// **'Жёлтый'**
  String get colorYellow;

  /// No description provided for @colorGreen.
  ///
  /// In ru, this message translates to:
  /// **'Зелёный'**
  String get colorGreen;

  /// No description provided for @colorBlue.
  ///
  /// In ru, this message translates to:
  /// **'Синий'**
  String get colorBlue;

  /// No description provided for @colorPurple.
  ///
  /// In ru, this message translates to:
  /// **'Фиолетовый'**
  String get colorPurple;

  /// No description provided for @colorPink.
  ///
  /// In ru, this message translates to:
  /// **'Розовый'**
  String get colorPink;

  /// No description provided for @colorBrown.
  ///
  /// In ru, this message translates to:
  /// **'Коричневый'**
  String get colorBrown;

  /// No description provided for @colorBeige.
  ///
  /// In ru, this message translates to:
  /// **'Бежевый'**
  String get colorBeige;

  /// No description provided for @colorGold.
  ///
  /// In ru, this message translates to:
  /// **'Золотой'**
  String get colorGold;

  /// No description provided for @colorSilver.
  ///
  /// In ru, this message translates to:
  /// **'Серебряный'**
  String get colorSilver;

  /// No description provided for @colorMulticolor.
  ///
  /// In ru, this message translates to:
  /// **'Разноцветный'**
  String get colorMulticolor;

  /// No description provided for @justNow.
  ///
  /// In ru, this message translates to:
  /// **'только что'**
  String get justNow;

  /// No description provided for @minutesAgo.
  ///
  /// In ru, this message translates to:
  /// **'{n} мин назад'**
  String minutesAgo(int n);

  /// No description provided for @hoursAgo.
  ///
  /// In ru, this message translates to:
  /// **'{n} ч назад'**
  String hoursAgo(int n);

  /// No description provided for @daysAgo.
  ///
  /// In ru, this message translates to:
  /// **'{n} дн назад'**
  String daysAgo(int n);

  /// No description provided for @aiAnalyzing.
  ///
  /// In ru, this message translates to:
  /// **'Распознаём вещь на фото…'**
  String get aiAnalyzing;

  /// No description provided for @aiAnalyzingBody.
  ///
  /// In ru, this message translates to:
  /// **'AI определит категорию, цвет, бренд и модель и заполнит описание'**
  String get aiAnalyzingBody;

  /// No description provided for @aiFilled.
  ///
  /// In ru, this message translates to:
  /// **'AI заполнил: {fields}. Проверьте и при необходимости исправьте'**
  String aiFilled(String fields);

  /// No description provided for @aiTitle.
  ///
  /// In ru, this message translates to:
  /// **'название'**
  String get aiTitle;

  /// No description provided for @aiPhotoHint.
  ///
  /// In ru, this message translates to:
  /// **'Фото размытое или тёмное — переснимите при хорошем свете, чтобы AI заполнил больше полей'**
  String get aiPhotoHint;

  /// No description provided for @phoneForListing.
  ///
  /// In ru, this message translates to:
  /// **'Ваш телефон'**
  String get phoneForListing;

  /// No description provided for @phoneListingNote.
  ///
  /// In ru, this message translates to:
  /// **'В объявлении номер скрыт. Его увидит только человек, чью заявку на вещь вы одобрите.'**
  String get phoneListingNote;

  /// No description provided for @phoneRequired.
  ///
  /// In ru, this message translates to:
  /// **'Укажите номер телефона'**
  String get phoneRequired;

  /// No description provided for @locationRequired.
  ///
  /// In ru, this message translates to:
  /// **'Выберите район, где вещь была найдена или потеряна'**
  String get locationRequired;

  /// No description provided for @editDetails.
  ///
  /// In ru, this message translates to:
  /// **'Изменить описание'**
  String get editDetails;

  /// No description provided for @aiRecognized.
  ///
  /// In ru, this message translates to:
  /// **'AI распознал: {item}'**
  String aiRecognized(String item);

  /// No description provided for @contactPhoneTitle.
  ///
  /// In ru, this message translates to:
  /// **'Телефон для связи'**
  String get contactPhoneTitle;

  /// No description provided for @copyPhone.
  ///
  /// In ru, this message translates to:
  /// **'Скопировать номер'**
  String get copyPhone;

  /// No description provided for @phoneCopied.
  ///
  /// In ru, this message translates to:
  /// **'Номер скопирован'**
  String get phoneCopied;

  /// No description provided for @aiResultTitle.
  ///
  /// In ru, this message translates to:
  /// **'AI распознал'**
  String get aiResultTitle;

  /// No description provided for @aiResultHint.
  ///
  /// In ru, this message translates to:
  /// **'Нажмите на поле, чтобы исправить'**
  String get aiResultHint;

  /// No description provided for @aiResultUnsure.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось уверенно определить вещь — выберите категорию на следующем шаге'**
  String get aiResultUnsure;

  /// No description provided for @aiMaybe.
  ///
  /// In ru, this message translates to:
  /// **'Возможно: {category}'**
  String aiMaybe(String category);

  /// No description provided for @aiFromText.
  ///
  /// In ru, this message translates to:
  /// **'Подобрано по описанию'**
  String get aiFromText;

  /// No description provided for @chooseCategory.
  ///
  /// In ru, this message translates to:
  /// **'Выберите категорию'**
  String get chooseCategory;

  /// No description provided for @chooseColor.
  ///
  /// In ru, this message translates to:
  /// **'Выберите цвет'**
  String get chooseColor;

  /// No description provided for @notSet.
  ///
  /// In ru, this message translates to:
  /// **'не указано'**
  String get notSet;

  /// No description provided for @publishConsent.
  ///
  /// In ru, this message translates to:
  /// **'Нажимая «Опубликовать», вы принимаете правила публикации и подтверждаете, что не размещаете чужие личные данные.'**
  String get publishConsent;

  /// No description provided for @homeEmptyRecent.
  ///
  /// In ru, this message translates to:
  /// **'Пока здесь пусто — опубликуйте первую находку'**
  String get homeEmptyRecent;

  /// No description provided for @locateButton.
  ///
  /// In ru, this message translates to:
  /// **'Определить по местоположению'**
  String get locateButton;

  /// No description provided for @locateDone.
  ///
  /// In ru, this message translates to:
  /// **'Район определён: {area}. Можно поменять ниже.'**
  String locateDone(String area);

  /// No description provided for @locateDenied.
  ///
  /// In ru, this message translates to:
  /// **'Нет доступа к местоположению — выберите район вручную.'**
  String get locateDenied;

  /// No description provided for @locateNotFound.
  ///
  /// In ru, this message translates to:
  /// **'Рядом нет известных районов — выберите вручную.'**
  String get locateNotFound;

  /// No description provided for @locateFailed.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось определить местоположение — выберите район вручную.'**
  String get locateFailed;

  /// No description provided for @scamTitle.
  ///
  /// In ru, this message translates to:
  /// **'Как обманывают и как защититься'**
  String get scamTitle;

  /// No description provided for @scam1t.
  ///
  /// In ru, this message translates to:
  /// **'«Я нашёл вашу вещь, переведите за доставку»'**
  String get scam1t;

  /// No description provided for @scam1d.
  ///
  /// In ru, this message translates to:
  /// **'Настоящий нашедший не просит денег заранее. Попросите назвать скрытый признак и встретьтесь лично.'**
  String get scam1d;

  /// No description provided for @scam2t.
  ///
  /// In ru, this message translates to:
  /// **'«Это моя вещь», но признаки назвать не может'**
  String get scam2t;

  /// No description provided for @scam2d.
  ///
  /// In ru, this message translates to:
  /// **'Настоящий владелец назовёт то, чего нет в объявлении. Не отдавайте вещь без проверки.'**
  String get scam2d;

  /// No description provided for @scam3t.
  ///
  /// In ru, this message translates to:
  /// **'«Назовите код из СМС»'**
  String get scam3t;

  /// No description provided for @scam3d.
  ///
  /// In ru, this message translates to:
  /// **'Так крадут деньги и аккаунты. Для возврата вещи не нужны ни коды, ни PIN, ни данные карты.'**
  String get scam3d;

  /// No description provided for @scam4t.
  ///
  /// In ru, this message translates to:
  /// **'«Я сотрудник Табылды»'**
  String get scam4t;

  /// No description provided for @scam4d.
  ///
  /// In ru, this message translates to:
  /// **'Табылды не звонит и не просит денег или данных. Не верьте таким звонкам.'**
  String get scam4d;

  /// No description provided for @scam5t.
  ///
  /// In ru, this message translates to:
  /// **'«Верну только за деньги»'**
  String get scam5t;

  /// No description provided for @scam5d.
  ///
  /// In ru, this message translates to:
  /// **'Не соглашайтесь и пожалуйтесь на объявление. Если угрожают — звоните 102.'**
  String get scam5d;

  /// No description provided for @scamHelp.
  ///
  /// In ru, this message translates to:
  /// **'Если вас обманули: пожалуйтесь на объявление или собеседника, сохраните переписку и обратитесь в милицию (102).'**
  String get scamHelp;

  /// No description provided for @english.
  ///
  /// In ru, this message translates to:
  /// **'English'**
  String get english;

  /// No description provided for @commentsTitle.
  ///
  /// In ru, this message translates to:
  /// **'Комментарии'**
  String get commentsTitle;

  /// No description provided for @commentsCount.
  ///
  /// In ru, this message translates to:
  /// **'Комментарии · {n}'**
  String commentsCount(int n);

  /// No description provided for @commentsEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Комментариев пока нет. Видели эту вещь или знаете, где она? Напишите.'**
  String get commentsEmpty;

  /// No description provided for @commentHint.
  ///
  /// In ru, this message translates to:
  /// **'Написать комментарий…'**
  String get commentHint;

  /// No description provided for @commentRules.
  ///
  /// In ru, this message translates to:
  /// **'Комментарии видят все. Не пишите телефоны, адреса и скрытые признаки вещи — для связи есть заявка.'**
  String get commentRules;

  /// No description provided for @commentByOwner.
  ///
  /// In ru, this message translates to:
  /// **'Автор объявления'**
  String get commentByOwner;

  /// No description provided for @commentDelete.
  ///
  /// In ru, this message translates to:
  /// **'Удалить комментарий'**
  String get commentDelete;

  /// No description provided for @commentDeleted.
  ///
  /// In ru, this message translates to:
  /// **'Комментарий удалён'**
  String get commentDeleted;

  /// No description provided for @commentsClosed.
  ///
  /// In ru, this message translates to:
  /// **'Объявление закрыто — новые комментарии оставить нельзя.'**
  String get commentsClosed;

  /// No description provided for @notifComments.
  ///
  /// In ru, this message translates to:
  /// **'Комментарии к моим объявлениям'**
  String get notifComments;

  /// No description provided for @contactUs.
  ///
  /// In ru, this message translates to:
  /// **'Связаться с нами'**
  String get contactUs;

  /// No description provided for @contactUsSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Идеи, проблемы и отзывы о приложении'**
  String get contactUsSubtitle;

  /// No description provided for @feedbackIntro.
  ///
  /// In ru, this message translates to:
  /// **'Расскажите, что улучшить, что не работает или что понравилось. Команда читает каждое сообщение.'**
  String get feedbackIntro;

  /// No description provided for @feedbackKind.
  ///
  /// In ru, this message translates to:
  /// **'Тема'**
  String get feedbackKind;

  /// No description provided for @feedbackIdea.
  ///
  /// In ru, this message translates to:
  /// **'Идея'**
  String get feedbackIdea;

  /// No description provided for @feedbackProblem.
  ///
  /// In ru, this message translates to:
  /// **'Проблема'**
  String get feedbackProblem;

  /// No description provided for @feedbackPraise.
  ///
  /// In ru, this message translates to:
  /// **'Благодарность'**
  String get feedbackPraise;

  /// No description provided for @feedbackQuestion.
  ///
  /// In ru, this message translates to:
  /// **'Вопрос'**
  String get feedbackQuestion;

  /// No description provided for @feedbackOther.
  ///
  /// In ru, this message translates to:
  /// **'Другое'**
  String get feedbackOther;

  /// No description provided for @feedbackRating.
  ///
  /// In ru, this message translates to:
  /// **'Оценка приложения'**
  String get feedbackRating;

  /// No description provided for @feedbackMessage.
  ///
  /// In ru, this message translates to:
  /// **'Сообщение'**
  String get feedbackMessage;

  /// No description provided for @feedbackMessageHint.
  ///
  /// In ru, this message translates to:
  /// **'Например: добавьте фильтр по дате'**
  String get feedbackMessageHint;

  /// No description provided for @feedbackMessageRequired.
  ///
  /// In ru, this message translates to:
  /// **'Напишите хотя бы несколько слов'**
  String get feedbackMessageRequired;

  /// No description provided for @feedbackContact.
  ///
  /// In ru, this message translates to:
  /// **'Как с вами связаться (необязательно)'**
  String get feedbackContact;

  /// No description provided for @feedbackContactHint.
  ///
  /// In ru, this message translates to:
  /// **'Телефон, email или Telegram'**
  String get feedbackContactHint;

  /// No description provided for @feedbackSent.
  ///
  /// In ru, this message translates to:
  /// **'Спасибо! Сообщение отправлено команде.'**
  String get feedbackSent;

  /// No description provided for @helpQ5.
  ///
  /// In ru, this message translates to:
  /// **'Есть ли в приложении чат?'**
  String get helpQ5;

  /// No description provided for @helpA5.
  ///
  /// In ru, this message translates to:
  /// **'Да. Личный чат открывается между нашедшим и владельцем, когда автор объявления подтвердит заявку, — так мошенники не могут писать всем подряд. А под каждым объявлением можно оставлять открытые комментарии.'**
  String get helpA5;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'ky', 'ru'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'ky':
      return AppLocalizationsKy();
    case 'ru':
      return AppLocalizationsRu();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
