import { createClient } from '@/lib/supabase/server'
import { CodesTable } from './codes-table'

async function getCodes(status?: string, productId?: string) {
  const supabase = await createClient()

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

export default async function CodesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const [codes, products] = await Promise.all([
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
      </div>

      <CodesTable
        codes={codes}
        products={products}
        currentStatus={params.status || 'all'}
        currentProduct={params.product || 'all'}
      />
    </div>
  )
}
