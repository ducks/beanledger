/**
 * Outbound email. The transport is chosen by MAIL_TRANSPORT:
 *   console  (default) print the message to the server log
 *   file     append JSON lines to MAIL_OUTBOX; used by the e2e suite
 *   smtp     send through SMTP_URL (nodemailer) from MAIL_FROM
 */
import { env } from '$env/dynamic/private';
import fs from 'fs';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail(mail: Mail): Promise<void> {
  const transport = env.MAIL_TRANSPORT ?? 'console';
  if (transport === 'file') {
    const path = env.MAIL_OUTBOX;
    if (!path) throw new Error('MAIL_OUTBOX must be set when MAIL_TRANSPORT=file');
    fs.appendFileSync(path, JSON.stringify({ ...mail, sent_at: new Date().toISOString() }) + '\n');
    return;
  }
  if (transport === 'smtp') {
    if (!env.SMTP_URL || !env.MAIL_FROM) throw new Error('SMTP_URL and MAIL_FROM must be set when MAIL_TRANSPORT=smtp');
    const { default: nodemailer } = await import('nodemailer');
    const transporter = nodemailer.createTransport(env.SMTP_URL);
    await transporter.sendMail({ from: env.MAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text });
    return;
  }
  console.log(`[mail] to=${mail.to} subject=${JSON.stringify(mail.subject)}\n${mail.text}`);
}

/** Absolute link base: the configured ORIGIN in production, else the request's. */
export function linkBase(requestOrigin: string): string {
  return (env.ORIGIN ?? requestOrigin).replace(/\/$/, '');
}
