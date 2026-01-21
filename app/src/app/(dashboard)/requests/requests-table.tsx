'use client'

import { useState, useTransition } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, X, Loader2 } from 'lucide-react'
import { approveRequest, rejectRequest } from '@/lib/actions/requests'

interface Request {
  id: string
  email: string
  name: string | null
  status: string
  referred_by_code: string | null
  created_at: string
  products: { id: string; name: string; slug: string } | null
}

interface Product {
  id: string
  name: string
  slug: string
}

interface RequestsTableProps {
  requests: Request[]
  products: Product[]
  currentStatus: string
  currentProduct: string
}

export function RequestsTable({
  requests,
  products,
  currentStatus,
  currentProduct,
}: RequestsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingRequest, setRejectingRequest] = useState<Request | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approvedCode, setApprovedCode] = useState<string | null>(null)

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/requests?${params.toString()}`)
  }

  const handleApprove = async (request: Request) => {
    setProcessingId(request.id)
    startTransition(async () => {
      const result = await approveRequest(request.id)
      if (result.success && result.code) {
        setApprovedCode(result.code)
      }
      setProcessingId(null)
    })
  }

  const handleReject = async () => {
    if (!rejectingRequest) return
    setProcessingId(rejectingRequest.id)
    setRejectDialogOpen(false)
    startTransition(async () => {
      await rejectRequest(rejectingRequest.id, rejectReason)
      setProcessingId(null)
      setRejectingRequest(null)
      setRejectReason('')
    })
  }

  const openRejectDialog = (request: Request) => {
    setRejectingRequest(request)
    setRejectDialogOpen(true)
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
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
              <TableHead>Referral</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No requests found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.email}</TableCell>
                  <TableCell>{request.name || '-'}</TableCell>
                  <TableCell>{request.products?.name || '-'}</TableCell>
                  <TableCell>
                    {request.referred_by_code ? (
                      <Badge variant="outline">{request.referred_by_code}</Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    {new Date(request.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {request.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(request)}
                          disabled={isPending && processingId === request.id}
                        >
                          {isPending && processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          <span className="ml-1">Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRejectDialog(request)}
                          disabled={isPending && processingId === request.id}
                        >
                          <X className="h-4 w-4" />
                          <span className="ml-1">Reject</span>
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject the request from{' '}
              <strong>{rejectingRequest?.email}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              placeholder="Enter rejection reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approvedCode} onOpenChange={() => setApprovedCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Approved</DialogTitle>
            <DialogDescription>
              The invitation code has been generated.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-4 font-mono text-center text-lg">
            {approvedCode}
          </div>
          <DialogFooter>
            <Button onClick={() => setApprovedCode(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
