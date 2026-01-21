import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export interface AuthenticatedRequest {
  productId: string
  productSlug: string
  apiKeyId: string
}

export async function authenticateApiKey(
  request: NextRequest
): Promise<AuthenticatedRequest | NextResponse> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 }
    )
  }

  const apiKey = authHeader.substring(7)
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

  const supabase = createServiceClient()

  const { data: keyRecord, error } = await supabase
    .from('api_keys')
    .select('id, product_id, is_active, products(slug)')
    .eq('key_hash', keyHash)
    .single()

  if (error || !keyRecord) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  if (!keyRecord.is_active) {
    return NextResponse.json({ error: 'API key is inactive' }, { status: 401 })
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)

  const product = keyRecord.products as unknown as { slug: string }

  return {
    productId: keyRecord.product_id,
    productSlug: product.slug,
    apiKeyId: keyRecord.id,
  }
}

export function generateApiKey(): { key: string; hash: string } {
  const key = `vis_${crypto.randomBytes(32).toString('hex')}`
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  return { key, hash }
}
