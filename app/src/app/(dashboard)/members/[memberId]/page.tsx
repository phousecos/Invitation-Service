export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Users, Gift, Calendar } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ memberId: string }>
}

async function getMember(memberId: string) {
  const supabase = await createClient()

  const { data: member, error } = await supabase
    .from('members')
    .select(`
      *,
      products(id, name, slug, referral_cap_per_year),
      referred_by:referred_by_member_id(id, name, email)
    `)
    .eq('id', memberId)
    .single()

  if (error || !member) {
    return null
  }

  return member
}

async function getReferralStats(memberId: string) {
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()

  const [
    { count: totalReferrals },
    { count: qualifiedReferrals },
    { count: pendingReferrals },
    { count: rewardsThisYear },
    { data: referralsList },
  ] = await Promise.all([
    supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_member_id', memberId),
    supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_member_id', memberId)
      .eq('qualification_status', 'qualified'),
    supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_member_id', memberId)
      .eq('qualification_status', 'pending'),
    supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_member_id', memberId)
      .eq('reward_status', 'credited')
      .eq('reward_year', currentYear),
    supabase
      .from('referrals')
      .select(`
        *,
        referred:referred_member_id(name, email, status)
      `)
      .eq('referrer_member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return {
    totalReferrals: totalReferrals || 0,
    qualifiedReferrals: qualifiedReferrals || 0,
    pendingReferrals: pendingReferrals || 0,
    rewardsThisYear: rewardsThisYear || 0,
    referralsList: referralsList || [],
  }
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { memberId } = await params
  const [member, referralStats] = await Promise.all([
    getMember(memberId),
    getReferralStats(memberId),
  ])

  if (!member) {
    notFound()
  }

  const product = member.products as {
    id: string;
    name: string;
    slug: string;
    referral_cap_per_year: number
  }
  const referredBy = member.referred_by as {
    id: string;
    name: string | null;
    email: string
  } | null

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'trial':
        return 'warning'
      case 'churned':
        return 'destructive'
      case 'suspended':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getQualificationVariant = (status: string) => {
    switch (status) {
      case 'qualified':
        return 'success'
      case 'pending':
        return 'warning'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getRewardVariant = (status: string) => {
    switch (status) {
      case 'credited':
        return 'success'
      case 'pending':
        return 'warning'
      case 'forfeited':
      case 'capped':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/members">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{member.name || member.email}</h1>
          <p className="text-muted-foreground">{member.email}</p>
        </div>
        <Badge variant={getStatusVariant(member.status)} className="ml-auto">
          {member.status}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Product</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product?.name}</div>
            <p className="text-xs text-muted-foreground">{product?.slug}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              {referralStats.pendingReferrals} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rewards This Year</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referralStats.rewardsThisYear} / {product?.referral_cap_per_year || 10}
            </div>
            <p className="text-xs text-muted-foreground">Annual cap</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Member Since</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(member.created_at).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {member.first_paid_at
                ? `Paid since ${new Date(member.first_paid_at).toLocaleDateString()}`
                : 'Not yet paid'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Member Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Referral Code</p>
                <p className="font-mono">{member.referral_code || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Stripe Customer</p>
                <p className="font-mono text-xs">{member.stripe_customer_id || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Trial Ends</p>
                <p>
                  {member.trial_ends_at
                    ? new Date(member.trial_ends_at).toLocaleDateString()
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Referred By</p>
                <p>
                  {referredBy ? (
                    <Link
                      href={`/members/${referredBy.id}`}
                      className="text-primary hover:underline"
                    >
                      {referredBy.name || referredBy.email}
                    </Link>
                  ) : (
                    '-'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referral Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {referralStats.referralsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No referrals yet</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referred</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reward</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referralStats.referralsList.map((referral: {
                      id: string
                      qualification_status: string
                      reward_status: string
                      created_at: string
                      referred: { name: string | null; email: string; status: string }
                    }) => (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {referral.referred?.name || referral.referred?.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(referral.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getQualificationVariant(referral.qualification_status)}>
                            {referral.qualification_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRewardVariant(referral.reward_status)}>
                            {referral.reward_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
