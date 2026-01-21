import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripeClient, getStripeWebhookSecret } from '@/lib/stripe/client'
import { checkAndProcessReferralQualification } from '@/lib/services/referrals'

interface RouteParams {
  params: Promise<{ productSlug: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { productSlug } = await params

  // Get webhook secret for this product
  const webhookSecret = getStripeWebhookSecret(productSlug)
  if (!webhookSecret) {
    console.error(`No webhook secret configured for product: ${productSlug}`)
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    )
  }

  // Get Stripe client to verify signature
  const stripe = getStripeClient(productSlug)
  if (!stripe) {
    console.error(`No Stripe client configured for product: ${productSlug}`)
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    )
  }

  // Get the raw body for signature verification
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // Get product ID
  const { data: product } = await supabase
    .from('products')
    .select('id, trial_days')
    .eq('slug', productSlug)
    .single()

  if (!product) {
    console.error(`Product not found: ${productSlug}`)
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(supabase, product.id, subscription)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(supabase, product.id, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(supabase, product.id, subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(supabase, product.id, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(supabase, product.id, invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

async function handleSubscriptionCreated(
  supabase: ReturnType<typeof createServiceClient>,
  productId: string,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string

  // Find member by Stripe customer ID
  const { data: member } = await supabase
    .from('members')
    .select('id, status')
    .eq('product_id', productId)
    .eq('stripe_customer_id', customerId)
    .single()

  if (!member) {
    console.log(`No member found for Stripe customer: ${customerId}`)
    return
  }

  // Determine status based on subscription
  const status = subscription.status === 'trialing' ? 'trial' : 'active'

  // Update trial_ends_at if in trial
  const updates: Record<string, unknown> = { status }
  if (subscription.trial_end) {
    updates.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString()
  }

  await supabase.from('members').update(updates).eq('id', member.id)
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createServiceClient>,
  productId: string,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string

  const { data: member } = await supabase
    .from('members')
    .select('id, status')
    .eq('product_id', productId)
    .eq('stripe_customer_id', customerId)
    .single()

  if (!member) {
    return
  }

  // Map Stripe status to our status
  let status: 'trial' | 'active' | 'churned' | 'suspended' = member.status as 'trial' | 'active' | 'churned' | 'suspended'

  switch (subscription.status) {
    case 'trialing':
      status = 'trial'
      break
    case 'active':
      status = 'active'
      break
    case 'canceled':
    case 'unpaid':
      status = 'churned'
      break
    case 'past_due':
      status = 'suspended'
      break
  }

  await supabase.from('members').update({ status }).eq('id', member.id)
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServiceClient>,
  productId: string,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('product_id', productId)
    .eq('stripe_customer_id', customerId)
    .single()

  if (!member) {
    return
  }

  await supabase
    .from('members')
    .update({ status: 'churned' })
    .eq('id', member.id)
}

async function handlePaymentSucceeded(
  supabase: ReturnType<typeof createServiceClient>,
  productId: string,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string

  // Only process subscription invoices
  // Access subscription from billing_reason or lines
  const isSubscriptionInvoice = invoice.billing_reason === 'subscription_cycle' ||
    invoice.billing_reason === 'subscription_create' ||
    invoice.billing_reason === 'subscription_update'

  if (!isSubscriptionInvoice) {
    return
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, first_paid_at, status')
    .eq('product_id', productId)
    .eq('stripe_customer_id', customerId)
    .single()

  if (!member) {
    return
  }

  const updates: Record<string, unknown> = {}

  // Set first_paid_at if not already set
  if (!member.first_paid_at) {
    updates.first_paid_at = new Date().toISOString()
  }

  // Update status to active if was in trial
  if (member.status === 'trial') {
    updates.status = 'active'
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('members').update(updates).eq('id', member.id)
  }

  // Check for referral qualification
  await checkAndProcessReferralQualification(member.id)
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createServiceClient>,
  productId: string,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('product_id', productId)
    .eq('stripe_customer_id', customerId)
    .single()

  if (!member) {
    return
  }

  // Log the failed payment for admin review
  console.log(`Payment failed for member ${member.id}, invoice ${invoice.id}`)

  // Optionally suspend after multiple failures
  // For now, just log it
}
