import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { authenticateApiKey } from '@/lib/api/auth'
import { success, notFound, serverError } from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{ memberId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  // Authenticate API key
  const authResult = await authenticateApiKey(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const { productId } = authResult
  const { memberId } = await params

  const supabase = createServiceClient()

  // Get the member
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, referral_code, product_id')
    .eq('id', memberId)
    .eq('product_id', productId)
    .single()

  if (memberError || !member) {
    return notFound('Member not found')
  }

  // Get product for referral URL
  const { data: product } = await supabase
    .from('products')
    .select('slug, referral_cap_per_year')
    .eq('id', productId)
    .single()

  // Get referral stats
  const currentYear = new Date().getFullYear()

  // Total referrals made
  const { count: totalReferrals } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_member_id', memberId)

  // Qualified referrals (all time)
  const { count: qualifiedReferrals } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_member_id', memberId)
    .eq('qualification_status', 'qualified')

  // Pending referrals
  const { count: pendingReferrals } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_member_id', memberId)
    .eq('qualification_status', 'pending')

  // Rewards earned this year
  const { count: rewardsEarnedThisYear } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_member_id', memberId)
    .eq('reward_status', 'credited')
    .eq('reward_year', currentYear)

  // Get detailed referral list
  const { data: referralsList, error: referralsError } = await supabase
    .from('referrals')
    .select(`
      id,
      qualification_status,
      qualified_at,
      reward_status,
      reward_credited_at,
      created_at,
      referred_member:referred_member_id (
        name,
        email,
        status
      )
    `)
    .eq('referrer_member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (referralsError) {
    console.error('Failed to fetch referrals:', referralsError)
    return serverError('Failed to fetch referrals')
  }

  // Build referral URL
  const referralUrl = member.referral_code
    ? `https://${product?.slug || 'app'}.velorumsoftware.com/signup?ref=${member.referral_code}`
    : null

  return success({
    referral_code: member.referral_code,
    referral_url: referralUrl,
    total_referrals: totalReferrals || 0,
    qualified_referrals: qualifiedReferrals || 0,
    pending_referrals: pendingReferrals || 0,
    rewards_earned_this_year: rewardsEarnedThisYear || 0,
    rewards_max_per_year: product?.referral_cap_per_year || 10,
    referrals: referralsList,
  })
}
