import { createServiceClient } from '@/lib/supabase/server'
import { applyReferralCredit } from '@/lib/stripe/client'

export async function checkAndProcessReferralQualification(
  memberId: string
): Promise<void> {
  const supabase = createServiceClient()

  // Get the member with their referral info
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select(`
      id,
      first_paid_at,
      status,
      referred_by_member_id,
      product_id,
      products (
        slug,
        referral_qualification_days,
        referral_chargeback_buffer_days,
        referral_cap_per_year,
        config
      )
    `)
    .eq('id', memberId)
    .single()

  if (memberError || !member || !member.referred_by_member_id) {
    // Member not found or wasn't referred
    return
  }

  const product = member.products as unknown as {
    slug: string
    referral_qualification_days: number
    referral_chargeback_buffer_days: number
    referral_cap_per_year: number
    config: { monthly_price?: number }
  }

  // Check if member has been paid for long enough
  if (!member.first_paid_at) {
    return
  }

  const firstPaidDate = new Date(member.first_paid_at)
  const qualificationDate = new Date(firstPaidDate)
  qualificationDate.setDate(
    qualificationDate.getDate() + product.referral_qualification_days
  )

  const now = new Date()
  if (now < qualificationDate) {
    // Not yet qualified - need more time as paid member
    return
  }

  // Find the referral record
  const { data: referral, error: referralError } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_member_id', memberId)
    .eq('referrer_member_id', member.referred_by_member_id)
    .single()

  if (referralError || !referral) {
    console.error('Referral record not found for member:', memberId)
    return
  }

  // Check if already processed
  if (referral.qualification_status === 'qualified') {
    return
  }

  // Mark as qualified
  await supabase
    .from('referrals')
    .update({
      qualification_status: 'qualified',
      qualified_at: now.toISOString(),
    })
    .eq('id', referral.id)

  // Schedule reward processing after chargeback buffer
  // For now, we'll check if the buffer has passed and process immediately
  const rewardDate = new Date(qualificationDate)
  rewardDate.setDate(
    rewardDate.getDate() + product.referral_chargeback_buffer_days
  )

  if (now >= rewardDate) {
    await processReferralReward(referral.id)
  }
}

export async function processReferralReward(referralId: string): Promise<void> {
  const supabase = createServiceClient()

  // Get the referral with all needed info
  const { data: referral, error: referralError } = await supabase
    .from('referrals')
    .select(`
      *,
      referrer:referrer_member_id (
        id,
        status,
        stripe_customer_id,
        name
      ),
      product:product_id (
        slug,
        referral_cap_per_year,
        config
      )
    `)
    .eq('id', referralId)
    .single()

  if (referralError || !referral) {
    console.error('Referral not found:', referralId)
    return
  }

  // Check if already credited
  if (referral.reward_status === 'credited') {
    return
  }

  const referrer = referral.referrer as unknown as {
    id: string
    status: string
    stripe_customer_id: string | null
    name: string | null
  }

  const product = referral.product as unknown as {
    slug: string
    referral_cap_per_year: number
    config: { monthly_price?: number }
  }

  // Check if referrer is still active
  if (referrer.status !== 'active') {
    await supabase
      .from('referrals')
      .update({ reward_status: 'forfeited' })
      .eq('id', referralId)
    return
  }

  // Check if referrer has hit annual cap
  const currentYear = new Date().getFullYear()
  const { count: rewardsThisYear } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_member_id', referrer.id)
    .eq('reward_status', 'credited')
    .eq('reward_year', currentYear)

  if ((rewardsThisYear || 0) >= product.referral_cap_per_year) {
    await supabase
      .from('referrals')
      .update({ reward_status: 'capped' })
      .eq('id', referralId)
    return
  }

  // Check if referrer has Stripe customer ID
  if (!referrer.stripe_customer_id) {
    console.error('Referrer has no Stripe customer ID:', referrer.id)
    return
  }

  // Apply the credit
  const monthlyPrice = product.config?.monthly_price || 25
  const creditAmountCents = monthlyPrice * 100

  const success = await applyReferralCredit(
    product.slug,
    referrer.stripe_customer_id,
    creditAmountCents,
    `Referral reward - 1 free month`
  )

  if (success) {
    await supabase
      .from('referrals')
      .update({
        reward_status: 'credited',
        reward_credited_at: new Date().toISOString(),
      })
      .eq('id', referralId)

    // TODO: Send email notification to referrer
    console.log(`Referral reward credited for referrer ${referrer.id}`)
  } else {
    console.error('Failed to apply Stripe credit for referral:', referralId)
  }
}

export async function processPendingReferralRewards(): Promise<void> {
  const supabase = createServiceClient()

  // Find all qualified referrals that are past the chargeback buffer
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select(`
      id,
      qualified_at,
      product:product_id (
        referral_chargeback_buffer_days
      )
    `)
    .eq('qualification_status', 'qualified')
    .eq('reward_status', 'pending')
    .not('qualified_at', 'is', null)

  if (error || !referrals) {
    console.error('Failed to fetch pending referrals:', error)
    return
  }

  const now = new Date()

  for (const referral of referrals) {
    const product = referral.product as unknown as {
      referral_chargeback_buffer_days: number
    }

    const qualifiedAt = new Date(referral.qualified_at!)
    const rewardDate = new Date(qualifiedAt)
    rewardDate.setDate(
      rewardDate.getDate() + product.referral_chargeback_buffer_days
    )

    if (now >= rewardDate) {
      await processReferralReward(referral.id)
    }
  }
}
