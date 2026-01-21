import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { authenticateApiKey } from '@/lib/api/auth'
import { success, created, badRequest, serverError } from '@/lib/api/responses'

interface SubmitRequestBody {
  email: string
  name?: string
  form_data?: Record<string, unknown>
  referred_by_code?: string
}

export async function POST(request: NextRequest) {
  // Authenticate API key
  const authResult = await authenticateApiKey(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const { productId } = authResult

  // Parse request body
  let body: SubmitRequestBody
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  // Validate required fields
  if (!body.email || typeof body.email !== 'string') {
    return badRequest('Email is required')
  }

  const email = body.email.toLowerCase().trim()
  if (!email.includes('@')) {
    return badRequest('Invalid email format')
  }

  const supabase = createServiceClient()

  // Check if there's already a pending request for this email/product
  const { data: existingRequest } = await supabase
    .from('invitation_requests')
    .select('id, status')
    .eq('product_id', productId)
    .eq('email', email)
    .eq('status', 'pending')
    .single()

  if (existingRequest) {
    return success({
      id: existingRequest.id,
      status: 'pending',
      message: 'A request for this email is already pending',
    })
  }

  // Check if email already has an approved code or is a member
  const { data: existingMember } = await supabase
    .from('members')
    .select('id')
    .eq('product_id', productId)
    .eq('email', email)
    .single()

  if (existingMember) {
    return badRequest('This email is already registered')
  }

  // Validate referral code if provided
  let referredByCode = body.referred_by_code?.toUpperCase().trim() || null
  if (referredByCode) {
    const { data: referrer } = await supabase
      .from('members')
      .select('id, status')
      .eq('referral_code', referredByCode)
      .single()

    if (!referrer) {
      // Invalid referral code - we'll still accept the request but without the referral
      referredByCode = null
    } else if (referrer.status !== 'active') {
      // Referrer is not active - accept without referral
      referredByCode = null
    }
  }

  // Create the invitation request
  const { data: newRequest, error } = await supabase
    .from('invitation_requests')
    .insert({
      product_id: productId,
      email,
      name: body.name?.trim() || null,
      form_data: body.form_data || {},
      referred_by_code: referredByCode,
      status: 'pending',
    })
    .select('id, status, created_at')
    .single()

  if (error) {
    console.error('Failed to create invitation request:', error)
    return serverError('Failed to create request')
  }

  return created({
    id: newRequest.id,
    status: newRequest.status,
    message: 'Your request has been submitted and is pending review',
  })
}

export async function GET(request: NextRequest) {
  // Authenticate API key
  const authResult = await authenticateApiKey(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const { productId } = authResult
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  const supabase = createServiceClient()

  let query = supabase
    .from('invitation_requests')
    .select('*', { count: 'exact' })
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: requests, count, error } = await query

  if (error) {
    console.error('Failed to fetch requests:', error)
    return serverError('Failed to fetch requests')
  }

  return success({
    requests,
    total: count,
    limit,
    offset,
  })
}
