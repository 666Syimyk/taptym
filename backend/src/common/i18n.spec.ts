import { MESSAGES, MESSAGES_EN, resolveLocale, t } from './i18n';

describe('i18n', () => {
  it('has an English text for every message', () => {
    expect(Object.keys(MESSAGES).filter((k) => !MESSAGES_EN[k])).toEqual([]);
    expect(Object.keys(MESSAGES_EN).filter((k) => !MESSAGES[k])).toEqual([]);
  });

  it('resolves English and fills parameters', () => {
    expect(resolveLocale('en-US,en;q=0.9')).toBe('en');
    expect(t('notif.CLAIM_RECEIVED.body', 'en', { title: 'Wallet' })).toBe(
      'Someone claimed "Wallet".',
    );
  });
});
