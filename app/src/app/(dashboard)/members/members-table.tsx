'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

interface Member {
  id: string
  email: string
  name: string | null
  referral_code: string | null
  status: string
  trial_ends_at: string | null
  first_paid_at: string | null
  created_at: string
  products: { id: string; name: string; slug: string } | null
  referred_by: { name: string | null; email: string } | null
}

interface Product {
  id: string
  name: string
  slug: string
}

interface MembersTableProps {
  members: Member[]
  products: Product[]
  currentStatus: string
  currentProduct: string
}

export function MembersTable({
  members,
  products,
  currentStatus,
  currentProduct,
}: MembersTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/members?${params.toString()}`)
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

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

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={currentStatus} onValueChange={(v) => updateFilters('status', v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>

        <Select value={currentProduct} onValueChange={(v) => updateFilters('product', v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Referral Code</TableHead>
              <TableHead>Referred By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.email}</TableCell>
                  <TableCell>{member.name || '-'}</TableCell>
                  <TableCell>{member.products?.name || '-'}</TableCell>
                  <TableCell>
                    {member.referral_code ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                          {member.referral_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(member.referral_code!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {copiedCode === member.referral_code && (
                          <span className="text-xs text-green-600">Copied</span>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {member.referred_by ? (
                      <span className="text-sm">
                        {member.referred_by.name || member.referred_by.email}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(member.status)}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                    >
                      <Link href={`/members/${member.id}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
