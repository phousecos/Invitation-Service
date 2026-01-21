interface RequestReceivedParams {
  email: string
  productName: string
}

export function requestReceivedEmail({ email, productName }: RequestReceivedParams): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #111; margin: 0;">Velorum</h1>
      </div>

      <h2 style="color: #111;">We've Received Your Request</h2>

      <p>Hi there,</p>

      <p>Thank you for your interest in <strong>${productName}</strong>! We've received your invitation request and our team will review it shortly.</p>

      <p>You'll receive another email once your request has been reviewed with next steps to get started.</p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        The Velorum Team
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <p style="font-size: 12px; color: #666;">
        This email was sent to ${email} because you submitted an invitation request for ${productName}.
      </p>
    </body>
    </html>
  `
}

interface InvitationApprovedParams {
  email: string
  productName: string
  invitationCode: string
  signupUrl: string
}

export function invitationApprovedEmail({ email, productName, invitationCode, signupUrl }: InvitationApprovedParams): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #111; margin: 0;">Velorum</h1>
      </div>

      <h2 style="color: #111;">You're Invited!</h2>

      <p>Great news! Your invitation request for <strong>${productName}</strong> has been approved.</p>

      <p>Here's your invitation code:</p>

      <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
        <code style="font-size: 24px; font-weight: bold; color: #111; letter-spacing: 2px;">${invitationCode}</code>
      </div>

      <p>Use this code when you sign up to get started:</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${signupUrl}" style="background: #111; color: #fff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          Sign Up Now
        </a>
      </div>

      <p style="margin-top: 30px;">
        Welcome aboard!<br>
        The Velorum Team
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <p style="font-size: 12px; color: #666;">
        This email was sent to ${email}. Your invitation code is for one-time use only.
      </p>
    </body>
    </html>
  `
}

interface ReferralRewardParams {
  email: string
  referrerName: string
  referredName: string
  productName: string
  rewardAmount: string
}

export function referralRewardEmail({ email, referrerName, referredName, productName, rewardAmount }: ReferralRewardParams): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #111; margin: 0;">Velorum</h1>
      </div>

      <h2 style="color: #111;">You Earned a Referral Reward!</h2>

      <p>Hey ${referrerName},</p>

      <p>Great news! Your referral <strong>${referredName}</strong> has completed their qualification period on ${productName}.</p>

      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
        <p style="margin: 0; color: #166534; font-size: 18px;">
          <strong>${rewardAmount}</strong> credit has been applied to your account!
        </p>
      </div>

      <p>Keep sharing your referral code to earn more rewards. Thanks for spreading the word!</p>

      <p style="margin-top: 30px;">
        Cheers,<br>
        The Velorum Team
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <p style="font-size: 12px; color: #666;">
        This email was sent to ${email} regarding your ${productName} referral reward.
      </p>
    </body>
    </html>
  `
}
