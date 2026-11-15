import { describe, expect, it } from 'vitest';
import { resolveLinkBase, resolveMailTransport, resolveSmtpConfig } from './mail-config';

describe('account email configuration', () => {
  it('permits the console and file transports during development', () => {
    expect(resolveMailTransport({}, false)).toBe('console');
    expect(resolveMailTransport({ MAIL_TRANSPORT: 'file', MAIL_OUTBOX: '/tmp/outbox' }, false)).toBe('file');
    expect(() => resolveMailTransport({ MAIL_TRANSPORT: 'file' }, false)).toThrow('MAIL_OUTBOX');
  });

  it('rejects unsafe or incomplete production transports', () => {
    expect(() => resolveMailTransport({}, true)).toThrow('MAIL_TRANSPORT');
    expect(() => resolveMailTransport({ MAIL_TRANSPORT: 'console' }, true)).toThrow('smtp');
    expect(() => resolveMailTransport({ MAIL_TRANSPORT: 'file', MAIL_OUTBOX: '/tmp/outbox' }, true)).toThrow('smtp');
    expect(() => resolveMailTransport({ MAIL_TRANSPORT: 'typo' }, false)).toThrow('MAIL_TRANSPORT');
    expect(() => resolveMailTransport({ MAIL_TRANSPORT: 'smtp' }, true)).toThrow('SMTP_URL');
    expect(resolveMailTransport({ MAIL_TRANSPORT: 'smtp', SMTP_URL: 'smtps://example.test', MAIL_FROM: 'hello@example.test' }, true)).toBe('smtp');
  });

  it('requires a configured HTTPS origin without credentials, paths or queries in production', () => {
    expect(() => resolveLinkBase({}, 'https://request.example', true)).toThrow('ORIGIN');
    for (const origin of ['http://example.test', 'https://user:pass@example.test', 'https://example.test/path', 'https://example.test/?token=x', 'not a URL']) {
      expect(() => resolveLinkBase({ ORIGIN: origin }, 'https://request.example', true)).toThrow();
    }
    expect(resolveLinkBase({ ORIGIN: 'https://beans.example/' }, 'https://request.example', true)).toBe('https://beans.example');
    expect(resolveLinkBase({}, 'http://localhost:5173', false)).toBe('http://localhost:5173');
  });
});

describe('separate SMTP settings', () => {
  const settings = { SMTP_HOST: 'smtp.example.test', SMTP_PORT: '587', SMTP_USER: 'user@example.test', SMTP_PASSWORD: 'p@ss:/?# %word' };
  it('requires STARTTLS and preserves credentials verbatim', () => {
    expect(resolveSmtpConfig(settings)).toEqual({ host: settings.SMTP_HOST, port: 587, secure: false, requireTLS: true, auth: { user: settings.SMTP_USER, pass: settings.SMTP_PASSWORD } });
    expect(resolveMailTransport({ ...settings, MAIL_TRANSPORT: 'smtp', MAIL_FROM: 'hello@example.test' }, true)).toBe('smtp');
    expect(() => resolveMailTransport({ ...settings, MAIL_TRANSPORT: 'smtp' }, true)).toThrow('MAIL_FROM');
  });
  it('uses implicit TLS on 465 and requires STARTTLS on alternative ports', () => {
    expect(resolveSmtpConfig({ ...settings, SMTP_PORT: '465' })).toMatchObject({ port: 465, secure: true, requireTLS: false });
    expect(resolveSmtpConfig({ ...settings, SMTP_PORT: '2525' })).toMatchObject({ secure: false, requireTLS: true });
  });
  it('retains legacy URLs but rejects mixed configuration including empty fields', () => {
    const SMTP_URL = 'smtps://user:pass@example.test:465';
    expect(resolveSmtpConfig({ SMTP_URL })).toBe(SMTP_URL);
    for (const field of Object.keys(settings)) {
      expect(() => resolveSmtpConfig({ SMTP_URL, [field]: '' })).toThrow('not both');
      expect(() => resolveSmtpConfig({ ...settings, [field]: undefined })).toThrow('all required');
    }
    expect(() => resolveSmtpConfig({ ...settings, SMTP_URL: '' })).toThrow('not both');
  });
  it('rejects invalid ports and host URLs without leaking credentials', () => {
    for (const port of ['0', '-1', '65536', '587.5', '587x', '5e2', ' ']) {
      expect(() => resolveSmtpConfig({ ...settings, SMTP_PORT: port })).toThrow('SMTP_PORT');
    }
    for (const host of ['smtp://user:secret@example.test', 'example.test/path', ' example.test']) {
      expect(() => resolveSmtpConfig({ ...settings, SMTP_HOST: host })).toThrow('SMTP_HOST');
      try { resolveSmtpConfig({ ...settings, SMTP_HOST: host }); } catch (error) {
        expect(String(error)).not.toContain('secret');
        expect(String(error)).not.toContain(settings.SMTP_PASSWORD);
      }
    }
    expect(resolveSmtpConfig({ ...settings, SMTP_HOST: '::1' })).toMatchObject({ host: '::1' });
  });
});
