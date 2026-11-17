import { scanMessage } from './fraud-scanner';

describe('fraud scanner', () => {
  it('flags advance payment requests in Russian and Kyrgyz', () => {
    expect(scanMessage('Сначала предоплата 500 сом')).toContain('advance_payment');
    expect(scanMessage('Переведите деньги на карту, потом отдам')).toContain('advance_payment');
    expect(scanMessage('Алдын ала төлөңүз')).toContain('advance_payment');
  });

  it('flags OTP requests', () => {
    expect(scanMessage('Скажите код из смс, чтобы подтвердить')).toContain('otp_request');
    expect(scanMessage('Пришлите код подтверждения')).toContain('otp_request');
  });

  it('flags unknown links but not known map hosts', () => {
    expect(scanMessage('Смотри тут http://evil.example/login')).toContain('suspicious_link');
    expect(scanMessage('Встретимся тут https://2gis.kg/bishkek/firm/1')).not.toContain(
      'suspicious_link',
    );
  });

  it('leaves normal messages alone', () => {
    expect(scanMessage('Здравствуйте! Могу встретиться завтра у ТЦ Бишкек Парк в 18:00')).toEqual(
      [],
    );
  });
});
