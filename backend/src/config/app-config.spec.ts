import { loadConfig } from './app-config';

describe('configuration fails closed', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env = { NODE_ENV: 'test' };
  });
  afterAll(() => {
    process.env = saved;
  });
  it('rejects unimplemented transports rather than silently logging codes', () => {
    process.env.OTP_DELIVERY = 'sms';
    expect(() => loadConfig()).toThrow('OTP_DELIVERY');
    process.env.OTP_DELIVERY = 'console';
    process.env.PUSH_DRIVER = 'fcm';
    expect(() => loadConfig()).toThrow('PUSH_DRIVER');
  });
  it('requires relay credentials and a key for Claude', () => {
    process.env.OTP_DELIVERY = 'webhook';
    expect(() => loadConfig()).toThrow('OTP_WEBHOOK_URL');
    process.env.OTP_DELIVERY = 'console';
    process.env.AI_PROVIDER = 'anthropic';
    expect(() => loadConfig()).toThrow('ANTHROPIC_API_KEY');
    process.env.AI_PROVIDER = 'something';
    expect(() => loadConfig()).toThrow('AI_PROVIDER');
  });
  it('turns on-device AI on by default and Claude when a key is present', () => {
    expect(loadConfig().ai).toMatchObject({ provider: 'local', localModelDownload: false });
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    expect(loadConfig().ai).toMatchObject({ provider: 'anthropic', model: 'claude-opus-5-5' });
    process.env.AI_PROVIDER = 'disabled';
    expect(loadConfig().ai.provider).toBe('disabled');
  });
  it('refuses production defaults and nonpositive lifetimes', () => {
    process.env.NODE_ENV = 'production';
    expect(() => loadConfig()).toThrow('Unsafe production');
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_TTL_SECONDS = '0';
    expect(() => loadConfig()).toThrow('positive integer');
  });
});
