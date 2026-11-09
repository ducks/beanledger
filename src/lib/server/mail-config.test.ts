import { describe, expect, it } from 'vitest';
import { resolveLinkBase, resolveMailTransport } from './mail-config';

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
