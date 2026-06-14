import { env } from '@heed/config'
import nodemailer from 'nodemailer'
import type { Email } from './templates.ts'

export type SendArgs = Email & { to: string }

export interface EmailTransport {
  readonly name: string
  readonly enabled: boolean
  send(args: SendArgs): Promise<void>
}

/** No-op transport — logs and drops (email not configured). App still runs (SPEC §2). */
class NoopTransport implements EmailTransport {
  readonly name = 'none'
  readonly enabled = false
  async send(args: SendArgs) {
    console.warn(`[email] (noop) would send "${args.subject}" → ${args.to}`)
  }
}

class SmtpTransport implements EmailTransport {
  readonly name = 'smtp'
  readonly enabled = true
  private transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  })
  async send(args: SendArgs) {
    await this.transporter.sendMail({
      from: env.HEED_EMAIL_FROM,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    })
  }
}

class ResendTransport implements EmailTransport {
  readonly name = 'resend'
  readonly enabled = true
  async send(args: SendArgs) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.HEED_EMAIL_FROM,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    })
    if (!res.ok) throw new Error(`Resend failed: ${res.status}`)
  }
}

let transport: EmailTransport | null = null

export function getTransport(): EmailTransport {
  if (transport) return transport
  switch (env.HEED_EMAIL_TRANSPORT) {
    case 'smtp':
      transport = env.SMTP_HOST ? new SmtpTransport() : new NoopTransport()
      break
    case 'resend':
      transport = env.RESEND_API_KEY ? new ResendTransport() : new NoopTransport()
      break
    default:
      transport = new NoopTransport()
  }
  return transport
}

export async function sendEmail(args: SendArgs): Promise<void> {
  await getTransport().send(args)
}
