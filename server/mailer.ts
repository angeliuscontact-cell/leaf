import { env } from './env'

export interface MailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

/**
 * Uses Resend when RESEND_API_KEY is configured. Otherwise logs the message in
 * development (never silently claims delivery) and returns false.
 */
export async function sendMail(message: MailMessage): Promise<{ delivered: boolean; provider: string }> {
  if (env.mail.resendKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.mail.resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.mail.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) {
        console.error('[mail] Resend rejected the message', response.status, (await response.text()).slice(0, 300))
        return { delivered: false, provider: 'resend' }
      }
      return { delivered: true, provider: 'resend' }
    } catch (error) {
      console.error('[mail] Resend request failed', error)
      return { delivered: false, provider: 'resend' }
    }
  }

  console.log(`\n[mail:dev] To: ${message.to}\n[mail:dev] Subject: ${message.subject}\n[mail:dev] ${message.text}\n`)
  return { delivered: false, provider: 'console' }
}

export function verificationEmail(name: string, url: string): MailMessage {
  const text = `Hi ${name},\n\nWelcome to LEAF. Verify your email to secure your account and receive password recovery messages:\n\n${url}\n\nThis link expires in 48 hours. If you did not create a LEAF account, you can ignore this message.`
  return {
    to: '',
    subject: 'Verify your LEAF email',
    text,
    html: `<p>Hi ${escape(name)},</p><p>Welcome to LEAF. Verify your email to secure your account:</p><p><a href="${escape(url)}">Verify my email</a></p><p>This link expires in 48 hours. If you did not create a LEAF account, you can ignore this message.</p>`,
  }
}

export function resetEmail(name: string, url: string): MailMessage {
  const text = `Hi ${name},\n\nWe received a request to reset your LEAF password. Choose a new password here:\n\n${url}\n\nThis link expires in one hour. If you did not request a reset, no action is needed.`
  return {
    to: '',
    subject: 'Reset your LEAF password',
    text,
    html: `<p>Hi ${escape(name)},</p><p>We received a request to reset your LEAF password.</p><p><a href="${escape(url)}">Choose a new password</a></p><p>This link expires in one hour. If you did not request a reset, no action is needed.</p>`,
  }
}

function escape(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c] || c)
}
