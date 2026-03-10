import { sendEmail } from './client'
import {
  requestReceivedEmail,
  invitationApprovedEmail,
  referralRewardEmail,
  ProductBranding,
} from './templates'

export interface ProductEmailConfig {
  name: string
  slug: string
  brandName?: string | null
  brandColor?: string
  logoUrl?: string | null
  senderEmail?: string | null
  signupDomain?: string | null
}

function toBranding(product: ProductEmailConfig): ProductBranding {
  return {
    brandName: product.brandName || product.name,
    brandColor: product.brandColor || '#111111',
    logoUrl: product.logoUrl,
  }
}

function senderFrom(product: ProductEmailConfig): string | undefined {
  if (product.senderEmail) {
    return `${product.brandName || product.name} <${product.senderEmail}>`
  }
  return undefined
}

export async function sendRequestReceivedNotification(
  email: string,
  product: ProductEmailConfig
): Promise<void> {
  const branding = toBranding(product)
  await sendEmail({
    to: email,
    subject: `We've received your ${product.name} request`,
    html: requestReceivedEmail({ email, productName: product.name, branding }),
    from: senderFrom(product),
  })
}

export async function sendInvitationApprovedNotification(
  email: string,
  product: ProductEmailConfig,
  invitationCode: string
): Promise<void> {
  const branding = toBranding(product)
  const domain = product.signupDomain || `${product.slug}.velorumsoftware.com`
  const signupUrl = `https://${domain}/signup?code=${invitationCode}`

  await sendEmail({
    to: email,
    subject: `You're invited to ${product.name}!`,
    html: invitationApprovedEmail({
      email,
      productName: product.name,
      invitationCode,
      signupUrl,
      branding,
    }),
    from: senderFrom(product),
  })
}

export async function sendReferralRewardNotification(
  email: string,
  referrerName: string,
  referredName: string,
  product: ProductEmailConfig,
  rewardAmount: number
): Promise<void> {
  const branding = toBranding(product)
  await sendEmail({
    to: email,
    subject: `You earned a referral reward on ${product.name}!`,
    html: referralRewardEmail({
      email,
      referrerName,
      referredName,
      productName: product.name,
      rewardAmount: `$${rewardAmount}`,
      branding,
    }),
    from: senderFrom(product),
  })
}
