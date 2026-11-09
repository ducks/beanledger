/**
 * Outbound email. The transport is chosen by MAIL_TRANSPORT:
 *   console  (development default) print the message to the server log
 *   file     append JSON lines to MAIL_OUTBOX; used by the e2e suite
 *   smtp     send through SMTP_URL (nodemailer) from MAIL_FROM
 */
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { resolveLinkBase, resolveMailTransport } from './mail-config';
import fs from 'fs';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail(mail: Mail): Promise<void> {
  const transport = resolveMailTransport(env, !dev);
  if (transport === 'file') {
    const path = env.MAIL_OUTBOX;
    fs.appendFileSync(path!, JSON.stringify({ ...mail, sent_at: new Date().toISOString() }) + '\n');
    return;
  }
  if (transport === 'smtp') {
    const { default: nodemailer } = await import('nodemailer');
    const transporter = nodemailer.createTransport(env.SMTP_URL!);
    await transporter.sendMail({ from: env.MAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text });
    return;
  }
  console.log(`[mail] to=${mail.to} subject=${JSON.stringify(mail.subject)}\n${mail.text}`);
}

export function assertMailConfigured(): void {
  resolveMailTransport(env, !dev);
}

/** Account links require an explicit HTTPS origin outside development. */
export function linkBase(requestOrigin: string): string {
  return resolveLinkBase(env, requestOrigin, !dev);
}
