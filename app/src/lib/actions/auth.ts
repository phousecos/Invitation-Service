'use server'

import { createAdminSession, destroyAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function loginAction(email: string, password: string) {
  // Email is accepted for UI purposes but auth is password-only
  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const result = await createAdminSession(password)
  if (!result.success) {
    return { error: result.error || 'Invalid credentials' }
  }

  return { success: true }
}

export async function logoutAction() {
  await destroyAdminSession()
  redirect('/login')
}
