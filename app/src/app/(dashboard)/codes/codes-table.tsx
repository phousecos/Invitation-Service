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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Ban, Copy, Loader2 } from 'lucide-react'
import { generateCode, revokeCode } from '@/lib/actions/codes'

interface Code {
  id: string
  code: string
  code_type: string
  status: string
  issued_to_email: string | null
  redeemed_at: string | null
  created_at: string
  products: { id: string; name: string; slug: string } | null
}

interface Product {
  id: string
  name: string
  slug: string
}

interface CodesTableProps {
  codes: Code[]
  products: Product[]
  currentStatus: string
  currentProduct: string
}

export function CodesTable({
  codes,
  products,
  currentStatus,
  currentProduct,
}: CodesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [newCodeProduct, setNewCodeProduct] = useState('')
  const [newCodeEmail, setNewCodeEmail] = useState('')
  const [newCodeType, setNewCodeType] = useState<'standard' | 'sales'>('standard')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/codes?${params.toString()}`)
  }

  const handleGenerateCode = async () => {
    if (!newCodeProduct) return
    startTransition(async () => {
      const result = await generateCode(newCodeProduct, newCodeEmail || undefined, newCodeType)
      if (result.success && result.code) {
        setGeneratedCode(result.code)
      }
    })
  }

  const handleRevokeCode = async (codeId: string) => {
    setProcessingId(codeId)
    startTransition(async () => {
      await revokeCode(codeId)
      setProcessingId(null)
    })
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const resetGenerateDialog = () => {
    setGenerateDialogOpen(false)
    setNewCodeProduct('')
    setNewCodeEmail('')
    setNewCodeType('standard')
    setGeneratedCode(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="flex gap-4">
          <Select value={currentStatus} onValueChange={(v) => updateFilters('status', v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="redeemed">Redeemed</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
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

        <Dialog open={generateDialogOpen} onOpenChange={resetGenerateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setGenerateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {generatedCode ? 'Code Generated' : 'Generate Invitation Code'}
              </DialogTitle>
              <DialogDescription>
                {generatedCode
                  ? 'The invitation code has been created.'
                  : 'Create a new invitation code manually.'}
              </DialogDescription>
            </DialogHeader>
            {generatedCode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md bg-muted p-4 font-mono text-center text-lg">
                    {generatedCode}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(generatedCode)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copiedCode === generatedCode && (
                  <p className="text-sm text-green-600 text-center">Copied!</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select value={newCodeProduct} onValueChange={setNewCodeProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Code Type</Label>
                  <Select value={newCodeType} onValueChange={(v) => setNewCodeType(v as 'standard' | 'sales')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Issue To Email (optional)</Label>
                  <Input
                    placeholder="recipient@example.com"
                    value={newCodeEmail}
                    onChange={(e) => setNewCodeEmail(e.target.value)}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              {generatedCode ? (
                <Button onClick={resetGenerateDialog}>Done</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={resetGenerateDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleGenerateCode} disabled={!newCodeProduct || isPending}>
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Generate
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Issued To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No codes found
                </TableCell>
              </TableRow>
            ) : (
              codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm">{code.code}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(code.code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {copiedCode === code.code && (
                        <span className="text-xs text-green-600">Copied</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{code.products?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{code.code_type}</Badge>
                  </TableCell>
                  <TableCell>{code.issued_to_email || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        code.status === 'active'
                          ? 'success'
                          : code.status === 'redeemed'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {code.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(code.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {code.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevokeCode(code.id)}
                        disabled={isPending && processingId === code.id}
                      >
                        {isPending && processingId === code.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                        <span className="ml-1">Revoke</span>
                      </Button>
                    )}
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
