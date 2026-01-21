export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { ProductsGrid } from './products-grid'

async function getProducts() {
  const supabase = await createClient()

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch products:', error)
    return []
  }

  return products || []
}

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-muted-foreground">
          Configure product settings and referral rules
        </p>
      </div>

      <ProductsGrid products={products} />
    </div>
  )
}
