/**
 * Checks the public text of a listing. Unlike the chat scanner it blocks: a listing is
 * read by everyone, and contacts hidden in the text bypass the claim-based contact flow.
 */
export type ListingTextIssue = 'item.text_contacts' | 'item.money_request';

// JS `\b` only knows Latin letters, so word edges are spelled out to work for Cyrillic too.
const S = '(?<![\\p{L}\\d])';
const E = '(?![\\p{L}\\d])';
const re = (source: string) => new RegExp(source.replaceAll('<S>', S).replaceAll('<E>', E), 'u');

const CONTACTS = re(
  'https?://|www\\.|<S>t\\.me<E>|<S>wa\\.me<E>|@[a-z0-9_]{3,}|[\\w.+-]+@[\\w-]+\\.\\w+' +
    '|<S>[\\w-]{2,}\\.(?:com|ru|kg|net|org|io|me|info|xyz|top|site|online|click|link|shop|store|club)<E>' +
    '|<S>[\\w-]{2,}\\.[a-z]{2,10}/' + // short links: bit.ly/abc
    '|<S>[a-zа-я]{2}\\s?\\d{6,8}<E>', // passport series and number: AN1234567
);
const DATES = re('<S>\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4}<E>');
const LONG_NUMBER = /(?:\d[\s\-().]*){9,}/; // phone, card number, personal number
const SPACED_LETTERS = re('(?<=<S>[\\p{L}\\d])[\\s.\\-_*]+(?=[\\p{L}\\d]<E>)');

// Requests for money or card data — forbidden to everyone.
const ASK_ANY = re(
  'предоплат|алдын ала төлө|залог|код\\p{L}*\\s+из\\s+смс|смс[\\s-]*код|cvv|cvc|картанын номер|номер\\p{L}*\\s+карт' +
    '|(?:перевед|перевес|перевод|скинь|скинут|закин|киньте|отправ)\\p{L}*\\s+(?:\\S+\\s+){0,3}?(?:карт|мбанк|mbank|элсом|elsom|оптим|optima|баланс|счет|кошел|денег|деньг)' +
    '|на\\s+(?:карту|мбанк|mbank|элсом|elsom|счет|баланс)<E>|акча\\p{L}*\\s+котор|картага',
);
// Forbidden to whoever holds the item: no payment for returning it.
const ASK_FINDER = re(
  'вознагражд|сыйлык|сыйакы|за\\s+деньги|верну\\s+за|отдам\\s+за|заплатит|заплати<E>|оплатит|оплат[ау]\\s+за|оплату<E>' +
    '|за\\s+доставк|жеткирүү\\s+үчүн|төлөңүз|төлөсөңүз|төлөп\\s+бер|за\\s+\\d+\\s*(?:сом|som|кгс|руб|тенге|доллар|\\$)',
);
const LOOKALIKE: Record<string, string> = { a: 'а', c: 'с', e: 'е', o: 'о', p: 'р', x: 'х', y: 'у', k: 'к', m: 'м', t: 'т', h: 'н', b: 'в' };

export function scanListingText(parts: (string | null | undefined)[], listingType: 'LOST' | 'FOUND'): ListingTextIssue | null {
  for (const part of parts) {
    if (!part) continue;
    const low = part.toLowerCase().replaceAll('ё', 'е');
    if (CONTACTS.test(low) || LONG_NUMBER.test(low.replace(new RegExp(DATES, 'gu'), ' '))) return 'item.text_contacts';
    // «п р е д о п л а т а» and «предoплата» with a Latin o must not pass
    const joined = low.replace(new RegExp(SPACED_LETTERS, 'gu'), '');
    const cyrillic = joined.replace(/[aceopxykmthb]/g, (ch) => LOOKALIKE[ch]);
    for (const text of [joined, cyrillic])
      if (ASK_ANY.test(text) || (listingType === 'FOUND' && ASK_FINDER.test(text))) return 'item.money_request';
  }
  return null;
}
