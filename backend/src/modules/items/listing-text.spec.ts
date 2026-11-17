import { scanListingText } from './listing-text';

describe('scanListingText', () => {
  it('blocks contacts and document numbers hidden in the text', () => {
    for (const text of ['Звоните 0700 123 456', 'Пишите @scammer_01', 'Сайт evil-site.com', 'Откройте bit.ly/abc', 'паспорт AN1234567', 'карта 4111 1111 1111 1111'])
      expect(scanListingText([text], 'FOUND')).toBe('item.text_contacts');
  });

  it('keeps dates and house numbers', () => {
    expect(scanListingText(['Нашёл 12.05.2024 возле школы №67, дом 12'], 'FOUND')).toBeNull();
  });

  it('blocks money requests, including disguised ones', () => {
    for (const text of ['Верну за вознаграждение', 'п р е д о п л а т а', 'предoплата', 'Скиньте на мбанк', 'за 500 сом верну'])
      expect(scanListingText([text], 'FOUND')).toBe('item.money_request');
    expect(scanListingText(['Переведите 500 сом на мбанк'], 'LOST')).toBe('item.money_request');
  });

  it('lets the owner promise a reward and allows ordinary descriptions', () => {
    expect(scanListingText(['Вознаграждение гарантирую'], 'LOST')).toBeNull();
    for (const text of ['Найдена карта оплаты проезда Тулпар', 'Кошелёк, внутри карта Мбанк', 'Заплатка на левом рукаве'])
      expect(scanListingText([text], 'FOUND')).toBeNull();
  });
});
