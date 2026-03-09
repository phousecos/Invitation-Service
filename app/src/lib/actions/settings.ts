'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdminSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

export async function createApiKey(productId: string, name: string) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) {
    return { error: 'Unauthorized' }
  }

  const supabase = createServiceClient()

  // Generate API key
  const key = `vis_${crypto.randomBytes(32).toString('hex')}`
  const keyHash = crypto.createHash('sha256').update(key).digest('hex')

  const { error: insertError } = await supabase.from('api_keys').insert({
    product_id: productId,
    key_hash: keyHash,
    name,
  })

  if (insertError) {
    console.error('Failed to create API key:', insertError)
    return { error: 'Failed to create API key' }
  }

  await supabase.from('audit_logs').insert({

    action_type: 'settings_changed',
    target_table: 'api_keys',
    details: { action: 'created', name, product_id: productId },
  })

  revalidatePath('/settings')

  // Return the key only once - it cannot be retrieved later
  return { success: true, key }
}

export async function revokeApiKey(keyId: string) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) {
    return { error: 'Unauthorized' }
  }

  const supabase = createServiceClient()

  const { error: updateError } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId)

  if (updateError) {
    return { error: 'Failed to revoke API key' }
  }

  await supabase.from('audit_logs').insert({

    action_type: 'settings_changed',
    target_table: 'api_keys',
    target_id: keyId,
    details: { action: 'revoked' },
  })

  revalidatePath('/settings')

  return { success: true }
}

export async function deleteApiKey(keyId: string) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) {
    return { error: 'Unauthorized' }
  }

  const supabase = createServiceClient()

  const { error: deleteError } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId)

  if (deleteError) {
    return { error: 'Failed to delete API key' }
  }

  await supabase.from('audit_logs').insert({

    action_type: 'settings_changed',
    target_table: 'api_keys',
    target_id: keyId,
    details: { action: 'deleted' },
  })

  revalidatePath('/settings')

  return { success: true }
}
