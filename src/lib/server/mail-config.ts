/** Configuration checks for account email; development transports stay opt-in in production. */
export type MailSettings = Record<string, string | undefined>;
export type MailTransport = 'console' | 'file' | 'smtp';

export function resolveMailTransport(settings: MailSettings, production: boolean): MailTransport {
  const transport = settings.MAIL_TRANSPORT ?? (production ? '' : 'console');
  if (transport !== 'console' && transport !== 'file' && transport !== 'smtp') {
    throw new Error('MAIL_TRANSPORT must be console, file, or smtp');
  }
  if (production && transport !== 'smtp') {
    throw new Error('MAIL_TRANSPORT must be smtp in production');
  }
  if (transport === 'file' && !settings.MAIL_OUTBOX) {
    throw new Error('MAIL_OUTBOX must be set when MAIL_TRANSPORT=file');
  }
  if (transport === 'smtp') {
    resolveSmtpConfig(settings);
    if (!settings.MAIL_FROM) throw new Error('MAIL_FROM must be set when MAIL_TRANSPORT=smtp');
  }
  return transport;
}

export function resolveLinkBase(settings: MailSettings, requestOrigin: string, production: boolean): string {
  if (production && !settings.ORIGIN) throw new Error('ORIGIN must be set in production');
  let url: URL;
  try {
    url = new URL(settings.ORIGIN ?? requestOrigin);
  } catch {
    throw new Error('ORIGIN must be a valid absolute URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:') ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('ORIGIN must be a plain HTTP(S) origin and use HTTPS in production');
  }
  return url.origin;
}

/** Separate credentials avoid URL escaping. Legacy URLs retain their existing semantics. */
export function resolveSmtpConfig(settings: MailSettings): string | {
  host: string; port: number; secure: boolean; requireTLS: boolean;
  auth: { user: string; pass: string };
} {
  const fields = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'];
  const hasFields = fields.some(key => settings[key] !== undefined);
  if (settings.SMTP_URL !== undefined && hasFields) {
    throw new Error('Use SMTP_URL or separate SMTP fields, not both');
  }
  if (settings.SMTP_URL) return settings.SMTP_URL;
  if (!hasFields) throw new Error('Set SMTP_URL or SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD');
  if (fields.some(key => !settings[key])) {
    throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD are all required');
  }
  const host = settings.SMTP_HOST!;
  if (/[\s/@?#]/.test(host) || host.includes('://')) {
    throw new Error('SMTP_HOST must be a hostname or IP address, without a URL scheme or path');
  }
  const portText = settings.SMTP_PORT!;
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be an integer between 1 and 65535');
  }
  return {
    host, port, secure: port === 465, requireTLS: port !== 465,
    auth: { user: settings.SMTP_USER!, pass: settings.SMTP_PASSWORD! }
  };
}
