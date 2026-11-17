/**
 * Lightweight anti-fraud scanner for chat messages (PRD §14.3). It flags, never blocks:
 * the recipient sees a safety hint next to the message.
 */
export type Warning = 'advance_payment' | 'otp_request' | 'suspicious_link';

const ADVANCE_PAYMENT =
  /(предоплат|аванс|переведи(те)?\s+(деньги|сумму|на\s+карту)|скинь(те)?\s+на\s+карту|оплат(а|и|ите)\s+вперёд|алдын\s*ала\s*төл|акча\s+котор)/i;
const OTP_REQUEST =
  /(код\s+(подтверждени|из\s+смс|из\s+sms)|смс[- ]?код|одноразов\w*\s+код|ырастоо\s+код|скажи(те)?\s+код|пришл\w*\s+код)/i;
const LINK = /(https?:\/\/|www\.)\S+/i;
const KNOWN_SAFE_HOSTS = [
  'tabyldy.kg',
  'maps.google.com',
  'goo.gl/maps',
  '2gis.kg',
  'yandex.kg',
  'maps.app.goo.gl',
];

export function scanMessage(body: string): Warning[] {
  const out: Warning[] = [];
  if (ADVANCE_PAYMENT.test(body)) out.push('advance_payment');
  if (OTP_REQUEST.test(body)) out.push('otp_request');
  const link = body.match(LINK);
  if (link && !KNOWN_SAFE_HOSTS.some((h) => link[0].toLowerCase().includes(h)))
    out.push('suspicious_link');
  return out;
}
