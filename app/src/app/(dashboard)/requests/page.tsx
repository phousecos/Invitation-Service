export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { RequestsTable } from './requests-table'

async function getRequests(status?: string, productId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('invitation_requests')
    .select('*, products(id, name, slug)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (productId && productId !== 'all') {
    query = query.eq('product_id', productId)
  }

  const { data: requests, error } = await query.limit(100)

  if (error) {
    console.error('Failed to fetch requests:', error)
    return []
  }

  return requests || []
}

async function getProducts() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug')
    .eq('is_active', true)

  return products || []
}

interface PageProps {
  searchParams: Promise<{ status?: string; product?: string }>
}

export default async function RequestsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const [requests, products] = await Promise.all([
    getRequests(params.status, params.product),
    getProducts(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Invitation Requests</h1>
        <p className="text-muted-foreground">
          Review and manage invitation requests
        </p>
      </div>

      <RequestsTable
        requests={requests}
        products={products}
        currentStatus={params.status || 'all'}
        currentProduct={params.product || 'all'}
      />
    </div>
  )
}
