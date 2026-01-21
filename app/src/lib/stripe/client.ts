import Stripe from 'stripe'

const stripeClients: Record<string, Stripe> = {}

export function getStripeClient(productSlug: string): Stripe | null {
  if (stripeClients[productSlug]) {
    return stripeClients[productSlug]
  }

  const envKey = `STRIPE_SECRET_KEY_${productSlug.toUpperCase()}`
  const secretKey = process.env[envKey]

  if (!secretKey) {
    console.error(`Missing Stripe secret key for product: ${productSlug}`)
    return null
  }

  stripeClients[productSlug] = new Stripe(secretKey, {
    apiVersion: '2025-12-15.clover',
  })

  return stripeClients[productSlug]
}

export function getStripeWebhookSecret(productSlug: string): string | null {
  const envKey = `STRIPE_WEBHOOK_SECRET_${productSlug.toUpperCase()}`
  return process.env[envKey] || null
}

export async function applyReferralCredit(
  productSlug: string,
  stripeCustomerId: string,
  amountInCents: number,
  description: string
): Promise<boolean> {
  const stripe = getStripeClient(productSlug)
  if (!stripe) {
    return false
  }

  try {
    // Create a negative invoice item (credit)
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: -amountInCents, // Negative for credit
      currency: 'usd',
      description,
    })

    return true
  } catch (error) {
    console.error('Failed to apply Stripe credit:', error)
    return false
  }
}
