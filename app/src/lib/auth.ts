'use server'

import { cookies } from 'next/headers'
import crypto from 'crypto'

const ADMIN_COOKIE_NAME = 'admin_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is not set')
  }
  return password
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  if (!sessionToken) return false

  // Verify the token is a valid HMAC of "admin" using the admin password
  const expected = hashToken(getAdminPassword())
  return sessionToken === expected
}

export async function createAdminSession(password: string): Promise<{ success: boolean; error?: string }> {
  if (password !== getAdminPassword()) {
    return { success: false, error: 'Invalid password' }
  }

  const sessionToken = hashToken(password)
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })

  return { success: true }
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE_NAME)
}
