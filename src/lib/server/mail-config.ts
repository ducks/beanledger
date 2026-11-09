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
  if (transport === 'smtp' && (!settings.SMTP_URL || !settings.MAIL_FROM)) {
    throw new Error('SMTP_URL and MAIL_FROM must be set when MAIL_TRANSPORT=smtp');
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
