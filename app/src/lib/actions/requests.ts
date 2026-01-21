'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendInvitationApprovedNotification } from '@/lib/email/notifications'

export async function approveRequest(requestId: string) {
  const supabase = await createClient()

  // Get the user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Get the request
  const { data: request, error: fetchError } = await supabase
    .from('invitation_requests')
    .select('*, products(name, slug)')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) {
    return { error: 'Request not found' }
  }

  if (request.status !== 'pending') {
    return { error: 'Request is not pending' }
  }

  // Generate invitation code using RPC
  const product = request.products as { name: string; slug: string }
  const { data: code, error: codeError } = await supabase.rpc(
    'generate_invitation_code',
    { product_slug: product.slug }
  )

  if (codeError || !code) {
    return { error: 'Failed to generate code' }
  }

  // Determine code type based on referral
  const codeType = request.referred_by_code ? 'referral' : 'standard'

  // Create the invitation code
  const { error: insertError } = await supabase.from('invitation_codes').insert({
    product_id: request.product_id,
    code,
    code_type: codeType,
    request_id: requestId,
    issued_to_email: request.email,
    created_by: user.id,
  })

  if (insertError) {
    return { error: 'Failed to create invitation code' }
  }

  // Update the request status
  const { error: updateError } = await supabase
    .from('invitation_requests')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (updateError) {
    return { error: 'Failed to update request' }
  }

  // Log the action
  await supabase.from('audit_logs').insert({
    admin_user_id: user.id,
    action_type: 'request_approved',
    target_table: 'invitation_requests',
    target_id: requestId,
    details: { email: request.email, code },
  })

  // Send email notification (don't block on failure)
  sendInvitationApprovedNotification(
    request.email,
    product.name,
    product.slug,
    code
  ).catch((err) => console.error('Failed to send approval email:', err))

  revalidatePath('/requests')
  revalidatePath('/')

  return { success: true, code }
}

export async function rejectRequest(requestId: string, reason?: string) {
  const supabase = await createClient()

  // Get the user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Get the request
  const { data: request, error: fetchError } = await supabase
    .from('invitation_requests')
    .select('email')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) {
    return { error: 'Request not found' }
  }

  // Update the request status
  const { error: updateError } = await supabase
    .from('invitation_requests')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq('id', requestId)

  if (updateError) {
    return { error: 'Failed to update request' }
  }

  // Log the action
  await supabase.from('audit_logs').insert({
    admin_user_id: user.id,
    action_type: 'request_rejected',
    target_table: 'invitation_requests',
    target_id: requestId,
    details: { email: request.email, reason },
  })

  revalidatePath('/requests')
  revalidatePath('/')

  return { success: true }
}
