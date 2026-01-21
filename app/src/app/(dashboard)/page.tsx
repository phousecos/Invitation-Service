import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Key, Users, TrendingUp } from 'lucide-react'
import Link from 'next/link'

async function getMetrics() {
  const supabase = await createClient()

  const [
    { count: pendingRequests },
    { count: totalMembers },
    { count: activeMembers },
    { count: activeCodes },
    { count: qualifiedReferrals },
    { data: recentRequests },
    { data: products },
  ] = await Promise.all([
    supabase
      .from('invitation_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('members').select('*', { count: 'exact', head: true }),
    supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('invitation_codes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('qualification_status', 'qualified'),
    supabase
      .from('invitation_requests')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('products').select('id, name, slug').eq('is_active', true),
  ])

  return {
    pendingRequests: pendingRequests || 0,
    totalMembers: totalMembers || 0,
    activeMembers: activeMembers || 0,
    activeCodes: activeCodes || 0,
    qualifiedReferrals: qualifiedReferrals || 0,
    recentRequests: recentRequests || [],
    products: products || [],
  }
}

export default async function DashboardPage() {
  const metrics = await getMetrics()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of invitation requests and member activity
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCodes}</div>
            <p className="text-xs text-muted-foreground">
              Ready to redeem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeMembers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Qualified Referrals
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.qualifiedReferrals}
            </div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.recentRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent requests</p>
            ) : (
              <div className="space-y-4">
                {metrics.recentRequests.map((request: {
                  id: string
                  email: string
                  status: string
                  created_at: string
                  products: { name: string } | null
                }) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{request.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.products?.name} &middot;{' '}
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        request.status === 'pending'
                          ? 'warning'
                          : request.status === 'approved'
                            ? 'success'
                            : 'destructive'
                      }
                    >
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/requests"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              View all requests
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.products.map((product: { id: string; name: string; slug: string }) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.slug}
                    </p>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              ))}
            </div>
            <Link
              href="/products"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              Manage products
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
