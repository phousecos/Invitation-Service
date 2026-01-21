'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function generateCode(
  productId: string,
  email?: string,
  codeType: 'standard' | 'sales' = 'standard'
) {
  const supabase = await createClient()

  // Get the user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Get the product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('slug')
    .eq('id', productId)
    .single()

  if (productError || !product) {
    return { error: 'Product not found' }
  }

  // Generate invitation code using RPC
  const { data: code, error: codeError } = await supabase.rpc(
    'generate_invitation_code',
    { product_slug: product.slug }
  )

  if (codeError || !code) {
    return { error: 'Failed to generate code' }
  }

  // Create the invitation code
  const { error: insertError } = await supabase.from('invitation_codes').insert({
    product_id: productId,
    code,
    code_type: codeType,
    issued_to_email: email || null,
    created_by: user.id,
  })

  if (insertError) {
    return { error: 'Failed to create invitation code' }
  }

  // Log the action
  await supabase.from('audit_logs').insert({
    admin_user_id: user.id,
    action_type: 'code_generated',
    target_table: 'invitation_codes',
    details: { code, email, code_type: codeType },
  })

  revalidatePath('/codes')
  revalidatePath('/')

  return { success: true, code }
}

export async function revokeCode(codeId: string) {
  const supabase = await createClient()

  // Get the user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Get the code
  const { data: existingCode, error: fetchError } = await supabase
    .from('invitation_codes')
    .select('code, status')
    .eq('id', codeId)
    .single()

  if (fetchError || !existingCode) {
    return { error: 'Code not found' }
  }

  if (existingCode.status !== 'active') {
    return { error: 'Code is not active' }
  }

  // Update the code status
  const { error: updateError } = await supabase
    .from('invitation_codes')
    .update({ status: 'revoked' })
    .eq('id', codeId)

  if (updateError) {
    return { error: 'Failed to revoke code' }
  }

  // Log the action
  await supabase.from('audit_logs').insert({
    admin_user_id: user.id,
    action_type: 'code_revoked',
    target_table: 'invitation_codes',
    target_id: codeId,
    details: { code: existingCode.code },
  })

  revalidatePath('/codes')
  revalidatePath('/')

  return { success: true }
}
