export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { ApiKeysSection } from './api-keys-section'

async function getApiKeys() {
  const supabase = await createClient()

  const { data: apiKeys, error } = await supabase
    .from('api_keys')
    .select('*, products(id, name, slug)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch API keys:', error)
    return []
  }

  return apiKeys || []
}

async function getProducts() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug')
    .eq('is_active', true)

  return products || []
}

export default async function SettingsPage() {
  const [apiKeys, products] = await Promise.all([
    getApiKeys(),
    getProducts(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage API keys and system configuration
        </p>
      </div>

      <ApiKeysSection apiKeys={apiKeys} products={products} />
    </div>
  )
}
