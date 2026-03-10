export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { CodesTable } from './codes-table'

async function getCodes(status?: string, productId?: string) {
  const supabase = createServiceClient()

  let query = supabase
    .from('invitation_codes')
    .select('*, products(id, name, slug)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (productId && productId !== 'all') {
    query = query.eq('product_id', productId)
  }

  const { data: codes, error } = await query.limit(100)

  if (error) {
    console.error('Failed to fetch codes:', error)
    return []
  }

  return codes || []
}

async function getProducts() {
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  console.log('Service client env check — URL:', hasUrl, 'SERVICE_KEY:', hasServiceKey)

  const supabase = createServiceClient()
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug')
    .eq('is_active', true)

  if (error) {
    console.error('Failed to fetch products:', error)
    return { products: [], debug: `Error: ${error.message} | URL: ${hasUrl} | KEY: ${hasServiceKey}` }
  }

  console.log('Products loaded:', products?.length ?? 0)
  return { products: products || [], debug: `Loaded ${products?.length ?? 0} products | URL: ${hasUrl} | KEY: ${hasServiceKey}` }
}

interface PageProps {
  searchParams: Promise<{ status?: string; product?: string }>
}

export default async function CodesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const [codes, productResult] = await Promise.all([
    getCodes(params.status, params.product),
    getProducts(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Invitation Codes</h1>
        <p className="text-muted-foreground">
          View and manage invitation codes
        </p>
        {/* Temporary debug info — remove after confirming products load */}
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          DEBUG: {productResult.debug}
        </p>
      </div>

      <CodesTable
        codes={codes}
        products={productResult.products}
        currentStatus={params.status || 'all'}
        currentProduct={params.product || 'all'}
      />
    </div>
  )
}
