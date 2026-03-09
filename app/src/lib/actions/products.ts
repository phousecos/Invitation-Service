'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdminSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateProduct(
  productId: string,
  data: {
    name?: string
    approval_mode?: 'manual' | 'auto' | 'sales'
    trial_days?: number
    referral_reward_months?: number
    referral_cap_per_year?: number
    referral_qualification_days?: number
    referral_chargeback_buffer_days?: number
    is_active?: boolean
    config?: Record<string, unknown>
  }
) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) {
    return { error: 'Unauthorized' }
  }

  const supabase = createServiceClient()

  const { error: updateError } = await supabase
    .from('products')
    .update(data)
    .eq('id', productId)

  if (updateError) {
    return { error: 'Failed to update product' }
  }

  await supabase.from('audit_logs').insert({
    admin_user_id: '00000000-0000-0000-0000-000000000000',
    action_type: 'product_updated',
    target_table: 'products',
    target_id: productId,
    details: data,
  })

  revalidatePath('/products')
  revalidatePath('/')

  return { success: true }
}
