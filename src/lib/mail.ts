import nodemailer from 'nodemailer'
import { renderResetCode } from '@/lib/emailTemplates'

type SendResult = { ok: boolean; status?: number; body?: string }

export async function sendMail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }): Promise<SendResult> {
  // Prefer SendGrid Web API when available
  if (process.env.SENDGRID_API_KEY) {
    try {
      // For password reset emails, prefer using template with richer HTML/text
      let tplHtml = html
      let tplText = text
      if (/reset\s*code/i.test(subject)) {
        // try to extract code from provided text; prefer explicit code param if available in future
        const match = (text.match(/(\d{6})/) || [])[0] || ''
        const r = renderResetCode(match, { appName: process.env.NEXT_PUBLIC_APP_NAME, supportUrl: process.env.APP_SUPPORT_URL, supportEmail: process.env.APP_SUPPORT_EMAIL })
        tplHtml = r.html
        tplText = r.text
      }
      const payload = {
        personalizations: [{ to: [{ email: to }], subject }],
        from: { email: process.env.EMAIL_FROM || 'no-reply@example.com' },
        content: [
          { type: 'text/plain', value: tplText },
          { type: 'text/html', value: tplHtml }
        ]
      }
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) return { ok: true }
      const body = await res.text().catch(() => '')
      return { ok: false, status: res.status, body }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, body: msg }
    }
  }

  // Fallback to SMTP/nodemailer when configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      })
      await transporter.sendMail({ from: process.env.EMAIL_FROM || 'no-reply@example.com', to, subject, text, html })
      return { ok: true }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, body: msg }
    }
  }

  // No mail configured — in debug mode, log to console; otherwise return ok to avoid account enumeration
  if (process.env.DEBUG_RESET === 'true') console.debug('Mail fallback: to=', to, 'subject=', subject, 'text=', text)
  return { ok: true }
}

const mail = { sendMail }
export default mail
