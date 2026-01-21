import { NextRequest } from 'next/server'
import { authenticateApiKey } from '@/lib/api/auth'
import { validateInvitationCode } from '@/lib/services/codes'
import { success, badRequest } from '@/lib/api/responses'

interface ValidateCodeBody {
  code: string
}

export async function POST(request: NextRequest) {
  // Authenticate API key
  const authResult = await authenticateApiKey(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const { productSlug } = authResult

  // Parse request body
  let body: ValidateCodeBody
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  if (!body.code || typeof body.code !== 'string') {
    return badRequest('Code is required')
  }

  const result = await validateInvitationCode(body.code)

  if (!result.valid) {
    return success({
      valid: false,
      error: result.error,
    })
  }

  // Check if the code belongs to the requesting product
  if (result.product_slug !== productSlug) {
    return success({
      valid: false,
      error: 'Code is for a different product',
    })
  }

  return success({
    valid: true,
    code_type: result.code_type,
    trial_days: result.trial_days,
    issued_to_email: result.issued_to_email,
  })
}
