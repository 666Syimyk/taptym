/**
 * Server-side localization for error messages, system chat messages and push texts.
 * No interface text is hard-coded elsewhere: every user-facing string goes through t().
 */
export type Locale = 'ru' | 'ky' | 'en';
export const SUPPORTED_LOCALES: Locale[] = ['ru', 'ky', 'en'];
export const DEFAULT_LOCALE: Locale = 'ru';

export function resolveLocale(input?: string | null): Locale {
  if (!input) return DEFAULT_LOCALE;
  const first = input.split(',')[0]?.trim().toLowerCase() ?? '';
  const lang = first.split(/[-_;]/)[0];
  if (lang === 'ky' || lang === 'kg' || lang === 'kir') return 'ky';
  if (lang === 'ru') return 'ru';
  if (lang === 'en') return 'en';
  return DEFAULT_LOCALE;
}

type Dict = Record<string, { ru: string; ky: string }>;

export const MESSAGES: Dict = {
  // generic
  'error.validation': {
    ru: 'Проверьте введённые данные.',
    ky: 'Киргизилген маалыматты текшериңиз.',
  },
  'error.unauthorized': {
    ru: 'Нужно подтвердить контакт, чтобы продолжить.',
    ky: 'Улантуу үчүн байланышты ырастаңыз.',
  },
  'error.forbidden': {
    ru: 'У вас нет доступа к этому действию.',
    ky: 'Бул аракетке укугуңуз жок.',
  },
  'error.not_found': {
    ru: 'Объект не найден или удалён.',
    ky: 'Объект табылган жок же өчүрүлгөн.',
  },
  'error.rate_limited': {
    ru: 'Слишком много попыток. Попробуйте позже.',
    ky: 'Аракеттер өтө көп. Кийинчерээк кайталаңыз.',
  },
  'error.conflict': { ru: 'Действие уже выполнено.', ky: 'Аракет мурда эле аткарылган.' },
  'error.internal': {
    ru: 'Что-то пошло не так. Мы уже разбираемся.',
    ky: 'Бир нерсе туура эмес болду. Биз иштеп жатабыз.',
  },
  'error.account_restricted': {
    ru: 'Действие временно недоступно для вашего аккаунта.',
    ky: 'Бул аракет аккаунтуңуз үчүн убактылуу жеткиликсиз.',
  },
  'error.account_banned': {
    ru: 'Аккаунт заблокирован. Обратитесь в поддержку.',
    ky: 'Аккаунт бөгөттөлгөн. Колдоо кызматына кайрылыңыз.',
  },
  // auth
  'auth.delivery_unavailable': {
    ru: 'Не удалось отправить код. Попробуйте позже.',
    ky: 'Код жөнөтүлгөн жок. Кийинчерээк кайталаңыз.',
  },
  'auth.code_sent': {
    ru: 'Если контакт указан верно, код отправлен.',
    ky: 'Байланыш туура болсо, код жөнөтүлдү.',
  },
  'auth.code_invalid': {
    ru: 'Неверный или просроченный код.',
    ky: 'Код туура эмес же мөөнөтү өткөн.',
  },
  'auth.too_many_attempts': {
    ru: 'Слишком много попыток ввода кода. Запросите новый код.',
    ky: 'Код киргизүү аракеттери өтө көп. Жаңы код сураңыз.',
  },
  'auth.resend_too_soon': {
    ru: 'Новый код можно запросить чуть позже.',
    ky: 'Жаңы кодду бир аздан кийин сурай аласыз.',
  },
  'auth.session_invalid': {
    ru: 'Сессия недействительна. Войдите снова.',
    ky: 'Сессия жараксыз. Кайра кириңиз.',
  },
  'auth.contact_invalid': {
    ru: 'Укажите корректный телефон или email.',
    ky: 'Туура телефон же email көрсөтүңүз.',
  },
  // items
  'item.not_published': { ru: 'Объявление пока недоступно.', ky: 'Жарнама азырынча жеткиликсиз.' },
  'item.cannot_claim_own': {
    ru: 'Нельзя подать заявку на собственное объявление.',
    ky: 'Өз жарнамаңызга табыштама бере албайсыз.',
  },
  'item.restricted_category_photo': {
    ru: 'Для документов, банковских карт и ключей фотография не публикуется. Опишите вещь словами.',
    ky: 'Документтер, банк карталары жана ачкычтар үчүн сүрөт жарыяланбайт. Буюмду сөз менен сүрөттөңүз.',
  },
  'item.status_transition_invalid': {
    ru: 'Это действие недоступно для текущего статуса.',
    ky: 'Бул аракет учурдагы статус үчүн жеткиликсиз.',
  },
  'item.media_not_ready': {
    ru: 'Фотография ещё обрабатывается или не прошла проверку.',
    ky: 'Сүрөт иштетилип жатат же текшерүүдөн өткөн жок.',
  },
  'item.media_not_owned': {
    ru: 'Фотография принадлежит другому пользователю.',
    ky: 'Сүрөт башка колдонуучуга таандык.',
  },
  'item.text_contacts': {
    ru: 'Уберите из текста телефоны, ссылки, @логины и номера документов. Связь идёт через заявку в приложении.',
    ky: 'Тексттен телефондорду, шилтемелерди, @логиндерди жана документ номерлерин алып салыңыз. Байланыш тиркемедеги табыштама аркылуу болот.',
  },
  'item.money_request': {
    ru: 'Нельзя просить деньги, предоплату или данные карты за возврат вещи.',
    ky: 'Буюмду кайтаруу үчүн акча, алдын ала төлөм же картанын маалыматын суроого болбойт.',
  },
  // media
  'media.invalid_file': {
    ru: 'Файл не является поддерживаемым изображением.',
    ky: 'Файл колдоого алынган сүрөт эмес.',
  },
  'media.too_large': { ru: 'Файл слишком большой.', ky: 'Файл өтө чоң.' },
  'media.blocked_sensitive': {
    ru: 'На фото обнаружены конфиденциальные данные. Такое изображение нельзя публиковать.',
    ky: 'Сүрөттө купуя маалымат табылды. Мындай сүрөттү жарыялоого болбойт.',
  },
  // claims
  'claim.duplicate_active': {
    ru: 'У вас уже есть активная заявка на эту вещь.',
    ky: 'Бул буюмга сиздин активдүү табыштамаңыз бар.',
  },
  'claim.limit_reached': {
    ru: 'Достигнут лимит заявок. Попробуйте позже.',
    ky: 'Табыштамалардын чеги жетти. Кийинчерээк кайталаңыз.',
  },
  'claim.intro': {
    ru: 'Чтобы защитить вещь от мошенников, нам нужно убедиться, что она действительно ваша.',
    ky: 'Буюмду алдамчылардан коргоо үчүн ал чын эле сиздики экенине ынанышыбыз керек.',
  },
  'claim.evidence_required': {
    ru: 'Добавьте хотя бы одно подтверждение.',
    ky: 'Жок дегенде бир ырастоо кошуңуз.',
  },
  'claim.decision_invalid': {
    ru: 'Недопустимое решение по заявке.',
    ky: 'Табыштама боюнча жараксыз чечим.',
  },
  // chat
  'chat.closed': { ru: 'Диалог закрыт.', ky: 'Диалог жабылды.' },
  'chat.blocked': {
    ru: 'Общение с этим пользователем недоступно.',
    ky: 'Бул колдонуучу менен сүйлөшүү жеткиликсиз.',
  },
  'chat.system.opened': {
    ru: 'Диалог открыт. Не переводите деньги заранее, не сообщайте коды подтверждения, для встречи выбирайте безопасное общественное место.',
    ky: 'Диалог ачылды. Акчаны алдын ала которбоңуз, ырастоо коддорун айтпаңыз, жолугушуу үчүн коопсуз коомдук жерди тандаңыз.',
  },
  'chat.system.handoff_proposed': {
    ru: 'Предложен способ передачи вещи. Подтвердите в разделе «Возврат».',
    ky: '«Кайтаруу» бөлүмүндө буюмду өткөрүп берүү ыкмасы сунушталды. Ырастаңыз.',
  },
  'chat.system.handoff_completed': {
    ru: 'Возврат подтверждён обеими сторонами. Спасибо!',
    ky: 'Кайтаруу эки тарап тарабынан ырасталды. Рахмат!',
  },
  'chat.warning.advance_payment': {
    ru: 'Собеседник упоминает предоплату. Не переводите деньги до получения вещи.',
    ky: 'Маектеш алдын ала төлөм жөнүндө айтып жатат. Буюмду албай туруп акча которбоңуз.',
  },
  'chat.warning.otp_request': {
    ru: 'Никому не сообщайте коды подтверждения.',
    ky: 'Ырастоо коддорун эч кимге айтпаңыз.',
  },
  'chat.warning.suspicious_link': {
    ru: 'Будьте осторожны с внешними ссылками.',
    ky: 'Тышкы шилтемелерге сак болуңуз.',
  },
  // handoff
  'handoff.token_invalid': {
    ru: 'Код подтверждения недействителен или уже использован.',
    ky: 'Ырастоо коду жараксыз же мурда колдонулган.',
  },
  'handoff.not_approved': {
    ru: 'Заявка ещё не одобрена для передачи.',
    ky: 'Табыштама өткөрүп берүүгө азырынча бекитилген жок.',
  },
  // notifications (title|body)
  'notif.MATCH_FOUND.title': {
    ru: 'Возможно, вашу вещь нашли',
    ky: 'Буюмуңуз табылган болушу мүмкүн',
  },
  'notif.MATCH_FOUND.body': {
    ru: 'Появилась похожая находка: {title}',
    ky: 'Окшош табылга чыкты: {title}',
  },
  'notif.CLAIM_RECEIVED.title': { ru: 'Новая заявка', ky: 'Жаңы табыштама' },
  'notif.CLAIM_RECEIVED.body': {
    ru: 'По объявлению «{title}» поступила заявка.',
    ky: '«{title}» жарнамасы боюнча табыштама келди.',
  },
  'notif.MESSAGE_RECEIVED.title': { ru: 'Новое сообщение', ky: 'Жаңы билдирүү' },
  'notif.MESSAGE_RECEIVED.body': {
    ru: 'Сообщение по объявлению «{title}».',
    ky: '«{title}» жарнамасы боюнча билдирүү.',
  },
  'notif.CLAIM_NEEDS_INFO.title': { ru: 'Нужны уточнения', ky: 'Тактоо керек' },
  'notif.CLAIM_NEEDS_INFO.body': {
    ru: 'По заявке на «{title}» запрошены дополнительные сведения.',
    ky: '«{title}» боюнча табыштамага кошумча маалымат суралды.',
  },
  'notif.CLAIM_APPROVED.title': { ru: 'Заявка одобрена', ky: 'Табыштама бекитилди' },
  'notif.CLAIM_APPROVED.body': {
    ru: 'Можно договориться о передаче «{title}».',
    ky: '«{title}» буюмун өткөрүп берүүгө макулдашсаңыз болот.',
  },
  'notif.CLAIM_REJECTED.title': { ru: 'Заявка отклонена', ky: 'Табыштама четке кагылды' },
  'notif.CLAIM_REJECTED.body': {
    ru: 'Заявка на «{title}» не подтверждена.',
    ky: '«{title}» боюнча табыштама ырасталган жок.',
  },
  'notif.HANDOFF_COMPLETED.title': { ru: 'Возврат завершён', ky: 'Кайтаруу аяктады' },
  'notif.HANDOFF_COMPLETED.body': {
    ru: 'Вещь «{title}» вернулась к владельцу.',
    ky: '«{title}» буюму ээсине кайтты.',
  },
  'notif.ITEM_NEEDS_FIX.title': {
    ru: 'Объявление требует исправления',
    ky: 'Жарнаманы оңдоо керек',
  },
  'notif.ITEM_NEEDS_FIX.body': { ru: '«{title}»: {note}', ky: '«{title}»: {note}' },
  'notif.SECURITY_WARNING.title': {
    ru: 'Предупреждение безопасности',
    ky: 'Коопсуздук эскертүүсү',
  },
  'notif.SECURITY_WARNING.body': { ru: '{note}', ky: '{note}' },
  'notif.SYSTEM.title': { ru: 'Табылды', ky: 'Табылды' },
  'notif.SYSTEM.body': { ru: '{note}', ky: '{note}' },
  // match reasons
  'match.same_category': { ru: 'Та же категория', ky: 'Ошол эле категория' },
  'match.similar_color': { ru: 'Похожий цвет', ky: 'Окшош түс' },
  'match.nearby_area': {
    ru: 'Объявления из близких районов',
    ky: 'Жакынкы райондордогу жарнамалар',
  },
  'match.dates_overlap': { ru: 'Даты могут совпадать', ky: 'Даталар дал келиши мүмкүн' },
  'match.similar_text': { ru: 'Похожее описание', ky: 'Окшош сүрөттөмө' },
  'match.same_brand': { ru: 'Тот же бренд', ky: 'Ошол эле бренд' },
  // account
  'account.deleted_name': { ru: 'Удалённый пользователь', ky: 'Өчүрүлгөн колдонуучу' },
  'account.default_name': { ru: 'Пользователь', ky: 'Колдонуучу' },
  // comments
  'comment.not_allowed': {
    ru: 'Комментарии к этому объявлению закрыты.',
    ky: 'Бул жарнамага комментарий жазууга болбойт.',
  },
  'comment.limit_reached': {
    ru: 'Слишком много комментариев. Попробуйте позже.',
    ky: 'Комментарийлер өтө көп. Кийинчерээк кайталаңыз.',
  },
  'notif.ITEM_COMMENT.title': { ru: 'Новый комментарий', ky: 'Жаңы комментарий' },
  'notif.ITEM_COMMENT.body': {
    ru: 'Под объявлением «{title}» оставили комментарий.',
    ky: '«{title}» жарнамасына комментарий калтырышты.',
  },
  // feedback
  'feedback.limit_reached': {
    ru: 'Вы уже отправили много сообщений. Попробуйте завтра.',
    ky: 'Сиз көп билдирүү жөнөттүңүз. Эртең кайталаңыз.',
  },
};

/** English texts, keyed like MESSAGES (i18n.spec.ts checks that none is missing). */
export const MESSAGES_EN: Record<string, string> = {
  'error.validation': 'Please check the details you entered.',
  'error.unauthorized': 'Please confirm your contact to continue.',
  'error.forbidden': 'You do not have access to this action.',
  'error.not_found': 'Not found or deleted.',
  'error.rate_limited': 'Too many attempts. Please try again later.',
  'error.conflict': 'This has already been done.',
  'error.internal': 'Something went wrong. We are looking into it.',
  'error.account_restricted': 'This action is temporarily unavailable for your account.',
  'error.account_banned': 'Your account is blocked. Please contact support.',
  'auth.delivery_unavailable': 'Could not send the code. Please try again later.',
  'auth.code_sent': 'If the contact is correct, the code has been sent.',
  'auth.code_invalid': 'The code is wrong or has expired.',
  'auth.too_many_attempts': 'Too many code attempts. Request a new code.',
  'auth.resend_too_soon': 'You can request a new code a little later.',
  'auth.session_invalid': 'Your session is no longer valid. Please sign in again.',
  'auth.contact_invalid': 'Enter a valid phone number or email.',
  'item.not_published': 'This listing is not available yet.',
  'item.cannot_claim_own': 'You cannot claim your own listing.',
  'item.restricted_category_photo':
    'Photos of documents, bank cards and keys are never published. Describe the item in words.',
  'item.status_transition_invalid': 'This action is not available in the current status.',
  'item.media_not_ready': 'The photo is still being processed or did not pass the check.',
  'item.media_not_owned': 'The photo belongs to another user.',
  'item.text_contacts':
    'Remove phone numbers, links, @usernames and document numbers from the text. People get in touch through a claim in the app.',
  'item.money_request':
    'You cannot ask for money, prepayment or card details for returning an item.',
  'media.invalid_file': 'The file is not a supported image.',
  'media.too_large': 'The file is too large.',
  'media.blocked_sensitive': 'The photo contains private data and cannot be published.',
  'claim.duplicate_active': 'You already have an active claim for this item.',
  'claim.limit_reached': 'Claim limit reached. Please try again later.',
  'claim.intro':
    'To protect the item from scammers, we need to make sure it really belongs to you.',
  'claim.evidence_required': 'Add at least one piece of proof.',
  'claim.decision_invalid': 'Invalid decision for this claim.',
  'chat.closed': 'This chat is closed.',
  'chat.blocked': 'You cannot talk to this user.',
  'chat.system.opened':
    'Chat opened. Do not send money in advance, never share confirmation codes, and meet in a safe public place.',
  'chat.system.handoff_proposed': 'A way to hand over the item was proposed. Confirm it in "Return".',
  'chat.system.handoff_completed': 'Both sides confirmed the return. Thank you!',
  'chat.warning.advance_payment':
    'The other person mentions prepayment. Do not send money before you get the item.',
  'chat.warning.otp_request': 'Never share confirmation codes with anyone.',
  'chat.warning.suspicious_link': 'Be careful with external links.',
  'handoff.token_invalid': 'The confirmation code is invalid or already used.',
  'handoff.not_approved': 'The claim has not been approved for handover yet.',
  'notif.MATCH_FOUND.title': 'Your item may have been found',
  'notif.MATCH_FOUND.body': 'A similar find appeared: {title}',
  'notif.CLAIM_RECEIVED.title': 'New claim',
  'notif.CLAIM_RECEIVED.body': 'Someone claimed "{title}".',
  'notif.MESSAGE_RECEIVED.title': 'New message',
  'notif.MESSAGE_RECEIVED.body': 'Message about "{title}".',
  'notif.CLAIM_NEEDS_INFO.title': 'More details needed',
  'notif.CLAIM_NEEDS_INFO.body': 'More details were requested for your claim on "{title}".',
  'notif.CLAIM_APPROVED.title': 'Claim approved',
  'notif.CLAIM_APPROVED.body': 'You can now arrange the handover of "{title}".',
  'notif.CLAIM_REJECTED.title': 'Claim rejected',
  'notif.CLAIM_REJECTED.body': 'Your claim on "{title}" was not confirmed.',
  'notif.HANDOFF_COMPLETED.title': 'Return completed',
  'notif.HANDOFF_COMPLETED.body': '"{title}" is back with its owner.',
  'notif.ITEM_NEEDS_FIX.title': 'Your listing needs a fix',
  'notif.ITEM_NEEDS_FIX.body': '"{title}": {note}',
  'notif.SECURITY_WARNING.title': 'Security warning',
  'notif.SECURITY_WARNING.body': '{note}',
  'notif.SYSTEM.title': 'Tabyldy',
  'notif.SYSTEM.body': '{note}',
  'match.same_category': 'Same category',
  'match.similar_color': 'Similar color',
  'match.nearby_area': 'Listings from nearby areas',
  'match.dates_overlap': 'Dates may match',
  'match.similar_text': 'Similar description',
  'match.same_brand': 'Same brand',
  'account.deleted_name': 'Deleted user',
  'account.default_name': 'User',
  'comment.not_allowed': 'Comments are closed for this listing.',
  'comment.limit_reached': 'Too many comments. Please try again later.',
  'notif.ITEM_COMMENT.title': 'New comment',
  'notif.ITEM_COMMENT.body': 'Someone commented on "{title}".',
  'feedback.limit_reached': 'You have sent many messages already. Please try again tomorrow.',
};

export function t(code: string, locale: Locale, params?: Record<string, string>): string {
  const entry = MESSAGES[code];
  let text = entry
    ? locale === 'en'
      ? (MESSAGES_EN[code] ?? entry.ru)
      : (entry[locale] ?? entry.ru)
    : code;
  if (params) for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, v);
  return text;
}
