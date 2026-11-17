import { WebhookOtpDelivery } from './otp-delivery';
import { loadConfig } from '../../config/app-config';

describe('OTP relay', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });
  it('sends the required delivery payload with a timeout and refuses redirects', async () => {
    const mock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mock;
    const cfg = {
      ...loadConfig().auth,
      otpWebhookUrl: 'https://relay.example/send',
      otpWebhookToken: 'test-token',
    };
    await new WebhookOtpDelivery(cfg).send('phone', '+996700000001', '123456', 'ky');
    const [url, request] = mock.mock.calls[0];
    expect(url).toBe(cfg.otpWebhookUrl);
    expect(request.redirect).toBe('error');
    expect(request.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(request.body)).toMatchObject({
      channel: 'phone',
      locale: 'ky',
      code: '123456',
    });
  });
  it('surfaces a delivery failure without exposing provider content', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('private provider response'));
    await expect(
      new WebhookOtpDelivery(loadConfig().auth).send('email', 'test@example.com', '123456', 'ru'),
    ).rejects.toMatchObject({ code: 'auth.delivery_unavailable' });
  });
});
