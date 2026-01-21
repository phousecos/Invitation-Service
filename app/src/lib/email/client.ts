import { Resend } from 'resend'

let resendClient: Resend | null = null

export function getResendClient(): Resend | null {
  if (resendClient) {
    return resendClient
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured - emails will not be sent')
    return null
  }

  resendClient = new Resend(apiKey)
  return resendClient
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams): Promise<boolean> {
  const resend = getResendClient()
  if (!resend) {
    console.log('Email skipped (Resend not configured):', { to, subject })
    return false
  }

  try {
    await resend.emails.send({
      from: from || 'Velorum <noreply@velorumsoftware.com>',
      to,
      subject,
      html,
    })
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}
