import { NextRequest } from 'next/server'
import { authenticateApiKey } from '@/lib/api/auth'
import { redeemInvitationCode, validateInvitationCode } from '@/lib/services/codes'
import { success, badRequest } from '@/lib/api/responses'

interface RedeemCodeBody {
  code: string
  member_email: string
  member_name: string
  stripe_customer_id: string
}

export async function POST(request: NextRequest) {
  // Authenticate API key
  const authResult = await authenticateApiKey(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const { productSlug } = authResult

  // Parse request body
  let body: RedeemCodeBody
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  // Validate required fields
  const errors: Record<string, string[]> = {}

  if (!body.code || typeof body.code !== 'string') {
    errors.code = ['Code is required']
  }

  if (!body.member_email || typeof body.member_email !== 'string') {
    errors.member_email = ['Member email is required']
  } else if (!body.member_email.includes('@')) {
    errors.member_email = ['Invalid email format']
  }

  if (!body.member_name || typeof body.member_name !== 'string') {
    errors.member_name = ['Member name is required']
  }

  if (!body.stripe_customer_id || typeof body.stripe_customer_id !== 'string') {
    errors.stripe_customer_id = ['Stripe customer ID is required']
  }

  if (Object.keys(errors).length > 0) {
    return badRequest('Validation failed', errors)
  }

  // First validate the code
  const validation = await validateInvitationCode(body.code)

  if (!validation.valid) {
    return success({
      success: false,
      error: validation.error,
    })
  }

  // Check if the code belongs to the requesting product
  if (validation.product_slug !== productSlug) {
    return success({
      success: false,
      error: 'Code is for a different product',
    })
  }

  // Check email match if code was issued to specific email
  if (
    validation.issued_to_email &&
    validation.issued_to_email.toLowerCase() !== body.member_email.toLowerCase()
  ) {
    return success({
      success: false,
      error: 'Code was issued to a different email address',
    })
  }

  // Redeem the code
  const result = await redeemInvitationCode(
    body.code,
    body.member_email,
    body.member_name,
    body.stripe_customer_id
  )

  if (!result.success) {
    return success({
      success: false,
      error: result.error,
    })
  }

  return success({
    success: true,
    member_id: result.member_id,
    referral_code: result.referral_code,
  })
}
