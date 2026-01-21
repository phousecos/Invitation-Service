'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Pencil, Loader2 } from 'lucide-react'
import { updateProduct } from '@/lib/actions/products'

interface Product {
  id: string
  slug: string
  name: string
  entity_type: string
  approval_mode: string
  trial_days: number
  referral_reward_months: number
  referral_cap_per_year: number
  referral_qualification_days: number
  referral_chargeback_buffer_days: number
  is_active: boolean
  config: { monthly_price?: number }
}

interface ProductsGridProps {
  products: Product[]
}

export function ProductsGrid({ products }: ProductsGridProps) {
  const [isPending, startTransition] = useTransition()
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<Partial<Product>>({})

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      approval_mode: product.approval_mode,
      trial_days: product.trial_days,
      referral_reward_months: product.referral_reward_months,
      referral_cap_per_year: product.referral_cap_per_year,
      referral_qualification_days: product.referral_qualification_days,
      referral_chargeback_buffer_days: product.referral_chargeback_buffer_days,
      is_active: product.is_active,
      config: product.config,
    })
  }

  const handleSave = async () => {
    if (!editingProduct) return
    startTransition(async () => {
      await updateProduct(editingProduct.id, formData)
      setEditingProduct(null)
    })
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-xl">{product.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{product.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={product.is_active ? 'success' : 'secondary'}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(product)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Entity Type</p>
                  <p className="font-medium capitalize">{product.entity_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Approval Mode</p>
                  <p className="font-medium capitalize">{product.approval_mode}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trial Days</p>
                  <p className="font-medium">{product.trial_days}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monthly Price</p>
                  <p className="font-medium">${product.config?.monthly_price || 0}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Referral Settings</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Reward</p>
                    <p>{product.referral_reward_months} month(s) free</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Annual Cap</p>
                    <p>{product.referral_cap_per_year} referrals</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Qualification</p>
                    <p>{product.referral_qualification_days} days</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Chargeback Buffer</p>
                    <p>{product.referral_chargeback_buffer_days} days</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editingProduct?.name}</DialogTitle>
            <DialogDescription>
              Update product settings and referral rules
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Approval Mode</Label>
                <Select
                  value={formData.approval_mode}
                  onValueChange={(v) => setFormData({ ...formData, approval_mode: v as 'manual' | 'auto' | 'sales' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trial Days</Label>
                <Input
                  type="number"
                  value={formData.trial_days || 0}
                  onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Price ($)</Label>
                <Input
                  type="number"
                  value={formData.config?.monthly_price || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: { ...formData.config, monthly_price: parseInt(e.target.value) }
                  })}
                />
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-4">Referral Settings</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reward (months free)</Label>
                  <Input
                    type="number"
                    value={formData.referral_reward_months || 0}
                    onChange={(e) => setFormData({ ...formData, referral_reward_months: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual Cap</Label>
                  <Input
                    type="number"
                    value={formData.referral_cap_per_year || 0}
                    onChange={(e) => setFormData({ ...formData, referral_cap_per_year: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Qualification Days</Label>
                  <Input
                    type="number"
                    value={formData.referral_qualification_days || 0}
                    onChange={(e) => setFormData({ ...formData, referral_qualification_days: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chargeback Buffer Days</Label>
                  <Input
                    type="number"
                    value={formData.referral_chargeback_buffer_days || 0}
                    onChange={(e) => setFormData({ ...formData, referral_chargeback_buffer_days: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
