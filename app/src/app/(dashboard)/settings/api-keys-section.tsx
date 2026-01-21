'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Ban, Copy, Loader2, Key } from 'lucide-react'
import { createApiKey, revokeApiKey, deleteApiKey } from '@/lib/actions/settings'

interface ApiKey {
  id: string
  name: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
  products: { id: string; name: string; slug: string } | null
}

interface Product {
  id: string
  name: string
  slug: string
}

interface ApiKeysSectionProps {
  apiKeys: ApiKey[]
  products: Product[]
}

export function ApiKeysSection({ apiKeys, products }: ApiKeysSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newKeyProduct, setNewKeyProduct] = useState('')
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  const handleCreateKey = async () => {
    if (!newKeyProduct || !newKeyName) return
    startTransition(async () => {
      const result = await createApiKey(newKeyProduct, newKeyName)
      if (result.success && result.key) {
        setGeneratedKey(result.key)
      }
    })
  }

  const handleRevokeKey = async (keyId: string) => {
    setProcessingId(keyId)
    startTransition(async () => {
      await revokeApiKey(keyId)
      setProcessingId(null)
    })
  }

  const handleDeleteKey = async (keyId: string) => {
    setProcessingId(keyId)
    startTransition(async () => {
      await deleteApiKey(keyId)
      setProcessingId(null)
    })
  }

  const copyToClipboard = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  const resetCreateDialog = () => {
    setCreateDialogOpen(false)
    setNewKeyProduct('')
    setNewKeyName('')
    setGeneratedKey(null)
    setCopiedKey(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage API keys for product integrations
          </CardDescription>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </CardHeader>
      <CardContent>
        {apiKeys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No API keys yet</p>
            <p className="text-sm">Create an API key to enable product integrations</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>{apiKey.products?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={apiKey.is_active ? 'success' : 'secondary'}>
                        {apiKey.is_active ? 'Active' : 'Revoked'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {apiKey.last_used_at
                        ? new Date(apiKey.last_used_at).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      {new Date(apiKey.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {apiKey.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevokeKey(apiKey.id)}
                            disabled={isPending && processingId === apiKey.id}
                          >
                            {isPending && processingId === apiKey.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                            <span className="ml-1">Revoke</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteKey(apiKey.id)}
                          disabled={isPending && processingId === apiKey.id}
                        >
                          {isPending && processingId === apiKey.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={createDialogOpen} onOpenChange={resetCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {generatedKey ? 'API Key Created' : 'Create API Key'}
            </DialogTitle>
            <DialogDescription>
              {generatedKey
                ? 'Copy your API key now. You won\'t be able to see it again.'
                : 'Create a new API key for a product integration.'}
            </DialogDescription>
          </DialogHeader>
          {generatedKey ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md font-mono text-sm break-all">
                {generatedKey}
              </div>
              <Button onClick={copyToClipboard} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                {copiedKey ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Store this key securely. It will not be shown again.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={newKeyProduct} onValueChange={setNewKeyProduct}>
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
                <Label>Key Name</Label>
                <Input
                  placeholder="e.g., Production API Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {generatedKey ? (
              <Button onClick={resetCreateDialog}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={resetCreateDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateKey}
                  disabled={!newKeyProduct || !newKeyName || isPending}
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Key
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
