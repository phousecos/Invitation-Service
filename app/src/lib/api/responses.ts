import { NextResponse } from 'next/server'

export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 })
}

export function badRequest(message: string, details?: Record<string, string[]>) {
  return NextResponse.json(
    { error: message, details },
    { status: 400 }
  )
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 })
}

export function serverError(message = 'Internal server error') {
  console.error('Server error:', message)
  return NextResponse.json({ error: message }, { status: 500 })
}
