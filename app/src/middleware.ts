import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_COOKIE_NAME = 'admin_session'

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function middleware(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD

  // If ADMIN_PASSWORD is not set, allow through (will fail at action level)
  if (!adminPassword) {
    return NextResponse.next()
  }

  // Allow public API routes through (they use API key auth)
  if (request.nextUrl.pathname.startsWith('/api/v1/')) {
    return NextResponse.next()
  }

  // Allow login page through
  if (request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  // Check admin session cookie
  const sessionToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  const expectedToken = await sha256(adminPassword)

  if (!sessionToken || sessionToken !== expectedToken) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
