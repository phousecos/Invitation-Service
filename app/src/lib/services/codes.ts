import { createServiceClient } from '@/lib/supabase/server'
import type { InvitationCode, InvitationCodeType } from '@/types/database'

export async function generateInvitationCode(
  productId: string,
  productSlug: string,
  options: {
    codeType?: InvitationCodeType
    requestId?: string
    issuedToEmail?: string
    createdBy?: string
    generatedByMemberId?: string
  } = {}
): Promise<InvitationCode | null> {
  const supabase = createServiceClient()

  // Generate unique code using database function
  const { data: codeResult, error: codeError } = await supabase.rpc(
    'generate_invitation_code',
    { product_slug: productSlug }
  )

  if (codeError || !codeResult) {
    console.error('Failed to generate code:', codeError)
    return null
  }

  const { data: invitationCode, error: insertError } = await supabase
    .from('invitation_codes')
    .insert({
      product_id: productId,
      code: codeResult,
      code_type: options.codeType || 'standard',
      request_id: options.requestId,
      issued_to_email: options.issuedToEmail,
      created_by: options.createdBy,
      generated_by_member_id: options.generatedByMemberId,
    })
    .select()
    .single()

  if (insertError) {
    console.error('Failed to insert invitation code:', insertError)
    return null
  }

  return invitationCode
}

export async function validateInvitationCode(code: string): Promise<{
  valid: boolean
  code_type?: InvitationCodeType
  trial_days?: number
  issued_to_email?: string | null
  product_slug?: string
  error?: string
}> {
  const supabase = createServiceClient()

  const { data: invitationCode, error } = await supabase
    .from('invitation_codes')
    .select(`
      *,
      products (
        slug,
        trial_days
      )
    `)
    .eq('code', code.toUpperCase())
    .single()

  if (error || !invitationCode) {
    return { valid: false, error: 'Code not found' }
  }

  if (invitationCode.status !== 'active') {
    return { valid: false, error: `Code is ${invitationCode.status}` }
  }

  const product = invitationCode.products as unknown as {
    slug: string
    trial_days: number
  }

  // For referral codes, check if the referrer is still active
  if (invitationCode.code_type === 'referral' && invitationCode.generated_by_member_id) {
    const { data: referrer } = await supabase
      .from('members')
      .select('status')
      .eq('id', invitationCode.generated_by_member_id)
      .single()

    if (!referrer || referrer.status !== 'active') {
      return { valid: false, error: 'Referrer is no longer active' }
    }
  }

  return {
    valid: true,
    code_type: invitationCode.code_type,
    trial_days: product.trial_days,
    issued_to_email: invitationCode.issued_to_email,
    product_slug: product.slug,
  }
}

export async function redeemInvitationCode(
  code: string,
  memberEmail: string,
  memberName: string,
  stripeCustomerId: string
): Promise<{
  success: boolean
  member_id?: string
  referral_code?: string
  error?: string
}> {
  const supabase = createServiceClient()

  // Get the invitation code with product info
  const { data: invitationCode, error: codeError } = await supabase
    .from('invitation_codes')
    .select(`
      *,
      products (
        id,
        slug,
        trial_days
      )
    `)
    .eq('code', code.toUpperCase())
    .eq('status', 'active')
    .single()

  if (codeError || !invitationCode) {
    return { success: false, error: 'Invalid or inactive code' }
  }

  const product = invitationCode.products as unknown as {
    id: string
    slug: string
    trial_days: number
  }

  // Check if member already exists for this product
  const { data: existingMember } = await supabase
    .from('members')
    .select('id')
    .eq('product_id', product.id)
    .eq('email', memberEmail.toLowerCase())
    .single()

  if (existingMember) {
    return { success: false, error: 'Member already exists for this product' }
  }

  // Generate referral code for the new member
  const { data: referralCode, error: refCodeError } = await supabase.rpc(
    'generate_referral_code',
    { member_name: memberName, product_slug: product.slug }
  )

  if (refCodeError) {
    console.error('Failed to generate referral code:', refCodeError)
    return { success: false, error: 'Failed to generate referral code' }
  }

  // Calculate trial end date
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + product.trial_days)

  // Determine if this is a referral and get the referrer
  let referredByMemberId: string | null = null
  if (invitationCode.code_type === 'referral' && invitationCode.generated_by_member_id) {
    referredByMemberId = invitationCode.generated_by_member_id
  }

  // Create the member
  const { data: newMember, error: memberError } = await supabase
    .from('members')
    .insert({
      product_id: product.id,
      email: memberEmail.toLowerCase(),
      name: memberName,
      invitation_code_id: invitationCode.id,
      referred_by_member_id: referredByMemberId,
      referral_code: referralCode,
      stripe_customer_id: stripeCustomerId,
      trial_ends_at: trialEndsAt.toISOString(),
      status: 'trial',
    })
    .select()
    .single()

  if (memberError || !newMember) {
    console.error('Failed to create member:', memberError)
    return { success: false, error: 'Failed to create member' }
  }

  // Mark the invitation code as redeemed
  await supabase
    .from('invitation_codes')
    .update({
      status: 'redeemed',
      redeemed_by_member_id: newMember.id,
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', invitationCode.id)

  // If this was a referral, create the referral record
  if (referredByMemberId) {
    const currentYear = new Date().getFullYear()

    await supabase.from('referrals').insert({
      product_id: product.id,
      referrer_member_id: referredByMemberId,
      referred_member_id: newMember.id,
      referral_code_used: code.toUpperCase(),
      qualification_status: 'pending',
      reward_status: 'pending',
      reward_year: currentYear,
    })
  }

  return {
    success: true,
    member_id: newMember.id,
    referral_code: referralCode,
  }
}
