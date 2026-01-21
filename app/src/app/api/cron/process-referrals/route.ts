import { NextResponse } from 'next/server'
import { processPendingReferralRewards } from '@/lib/services/referrals'

// Vercel Cron security - verify the request is from Vercel
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  // Verify cron secret if configured
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  try {
    await processPendingReferralRewards()

    return NextResponse.json({
      success: true,
      message: 'Referral rewards processed',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron job failed:', error)
    return NextResponse.json(
      { error: 'Failed to process referral rewards' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
