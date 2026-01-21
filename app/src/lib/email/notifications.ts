import { sendEmail } from './client'
import {
  requestReceivedEmail,
  invitationApprovedEmail,
  referralRewardEmail,
} from './templates'

export async function sendRequestReceivedNotification(
  email: string,
  productName: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `We've received your ${productName} request`,
    html: requestReceivedEmail({ email, productName }),
  })
}

export async function sendInvitationApprovedNotification(
  email: string,
  productName: string,
  productSlug: string,
  invitationCode: string
): Promise<void> {
  const signupUrl = `https://${productSlug}.velorumsoftware.com/signup?code=${invitationCode}`

  await sendEmail({
    to: email,
    subject: `You're invited to ${productName}!`,
    html: invitationApprovedEmail({
      email,
      productName,
      invitationCode,
      signupUrl,
    }),
  })
}

export async function sendReferralRewardNotification(
  email: string,
  referrerName: string,
  referredName: string,
  productName: string,
  rewardAmount: number
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `You earned a referral reward on ${productName}!`,
    html: referralRewardEmail({
      email,
      referrerName,
      referredName,
      productName,
      rewardAmount: `$${rewardAmount}`,
    }),
  })
}
