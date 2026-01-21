export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { MembersTable } from './members-table'

async function getMembers(status?: string, productId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('members')
    .select(`
      *,
      products(id, name, slug),
      referred_by:referred_by_member_id(name, email)
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (productId && productId !== 'all') {
    query = query.eq('product_id', productId)
  }

  const { data: members, error } = await query.limit(100)

  if (error) {
    console.error('Failed to fetch members:', error)
    return []
  }

  return members || []
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

export default async function MembersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const [members, products] = await Promise.all([
    getMembers(params.status, params.product),
    getProducts(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Members</h1>
        <p className="text-muted-foreground">
          View members and their referral activity
        </p>
      </div>

      <MembersTable
        members={members}
        products={products}
        currentStatus={params.status || 'all'}
        currentProduct={params.product || 'all'}
      />
    </div>
  )
}
