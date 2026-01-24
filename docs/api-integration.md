# Invitation Service API Integration Guide

This guide explains how to integrate AgentPMO, Prept, or other applications with the Velorum Invitation Service.

## Overview

The Invitation Service handles:
- Invitation request management
- Invitation code validation and redemption
- Stripe subscription creation
- Referral tracking and rewards

## Authentication

All API requests require an API key passed in the `X-API-Key` header.

```
X-API-Key: your_api_key_here
```

API keys are generated per-product in the Invitation Service admin dashboard under **Settings > API Keys**.

---

## Integration Flow

### Standard Signup with Invitation Code

```
1. User enters invitation code on your signup form
2. Your backend validates the code (optional but recommended)
3. User completes signup form
4. Your backend redeems the code (creates Stripe subscription)
5. Your backend creates user account with returned member data
6. User is redirected to dashboard
```

### Trial Signup (AgentPMO)

```
1. User signs up for trial (no invitation code)
2. Your backend creates invitation request via API
3. If auto-approved, code is returned immediately
4. Your backend redeems the code
5. User account created with trial subscription
```

---

## API Endpoints

Base URL: `https://your-invitation-service.vercel.app`

### 1. Validate Invitation Code

Check if a code is valid before completing signup. This is optional but provides better UX.

**Endpoint:** `POST /api/v1/codes/validate`

**Request:**
```json
{
  "code": "ABCD-1234-EFGH"
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "code": {
    "code": "ABCD-1234-EFGH",
    "product": {
      "slug": "agentpmo",
      "name": "AgentPMO",
      "trial_days": 14
    },
    "referrer_id": "uuid-of-referrer-or-null"
  }
}
```

**Error Response (400):**
```json
{
  "valid": false,
  "error": "Code has already been used"
}
```

**Possible errors:**
- `Invalid code format`
- `Code not found`
- `Code has expired`
- `Code has already been used`
- `Code has been revoked`

---

### 2. Redeem Invitation Code

Redeem a code to create the member record and Stripe subscription.

**Endpoint:** `POST /api/v1/codes/redeem`

**Request:**
```json
{
  "code": "ABCD-1234-EFGH",
  "email": "user@example.com",
  "name": "John Doe",
  "external_id": "your-user-id-123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | Yes | The invitation code |
| email | string | Yes | User's email address |
| name | string | No | User's display name |
| external_id | string | No | Your app's user ID for correlation |

**Success Response (200):**
```json
{
  "success": true,
  "member": {
    "id": "uuid-of-member",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "trial",
    "referral_code": "JOHN-5678-WXYZ",
    "stripe_customer_id": "cus_xxxxx",
    "stripe_subscription_id": "sub_xxxxx",
    "trial_ends_at": "2026-02-07T00:00:00Z"
  },
  "subscription": {
    "id": "sub_xxxxx",
    "status": "trialing",
    "trial_end": 1738886400,
    "current_period_end": 1738886400
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Code has already been used"
}
```

**Important:** Store the `member.id` in your user record. You'll need it for referral queries.

---

### 3. Create Invitation Request

Create a new invitation request (for trial signups or manual requests).

**Endpoint:** `POST /api/v1/requests`

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "source": "trial_signup",
  "referral_code": "JANE-1234-ABCD",
  "metadata": {
    "company": "Acme Inc",
    "role": "Product Manager"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address |
| name | string | No | User's display name |
| source | string | No | How they found you (e.g., "trial_signup", "website", "referral") |
| referral_code | string | No | Referrer's code if this is a referral |
| metadata | object | No | Additional data to store with request |

**Success Response (201) - Auto-approved:**
```json
{
  "id": "uuid-of-request",
  "status": "approved",
  "code": "ABCD-1234-EFGH",
  "message": "Request auto-approved"
}
```

**Success Response (201) - Pending approval:**
```json
{
  "id": "uuid-of-request",
  "status": "pending",
  "message": "Request submitted for review"
}
```

**Note:** Whether a request is auto-approved depends on the product's `approval_mode` setting:
- `auto` - Immediately approved, code returned
- `manual` - Requires admin approval
- `sales` - Requires sales team approval

---

### 4. Get Member Referrals

Retrieve a member's referral statistics and history for displaying in their dashboard.

**Endpoint:** `GET /api/v1/members/{member_id}/referrals`

**Response (200):**
```json
{
  "member": {
    "id": "uuid-of-member",
    "referral_code": "JOHN-5678-WXYZ",
    "referral_link": "https://agentpmo.com/join?ref=JOHN-5678-WXYZ"
  },
  "stats": {
    "total_referrals": 5,
    "qualified_referrals": 3,
    "pending_referrals": 2,
    "rewards_earned": 3,
    "rewards_this_year": 3,
    "annual_cap": 12
  },
  "referrals": [
    {
      "id": "uuid-of-referral",
      "referred_name": "Jane Smith",
      "status": "qualified",
      "reward_status": "credited",
      "created_at": "2026-01-15T10:30:00Z",
      "qualified_at": "2026-01-22T10:30:00Z"
    },
    {
      "id": "uuid-of-referral-2",
      "referred_name": "Bob Wilson",
      "status": "pending",
      "reward_status": "pending",
      "created_at": "2026-01-20T14:00:00Z",
      "qualified_at": null
    }
  ]
}
```

---

## Webhook Configuration

The Invitation Service needs to receive Stripe webhooks to track subscription lifecycle events (activations, cancellations, renewals).

### Setup Steps

1. In your Stripe Dashboard, go to **Developers > Webhooks**
2. Add endpoint: `https://your-invitation-service.vercel.app/api/v1/webhooks/stripe/{product_slug}`
   - For AgentPMO: `/api/v1/webhooks/stripe/agentpmo`
   - For Prept: `/api/v1/webhooks/stripe/prept`
3. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the webhook signing secret
5. Add to Invitation Service environment variables:
   - `STRIPE_WEBHOOK_SECRET_AGENTPMO=whsec_xxxxx`
   - `STRIPE_WEBHOOK_SECRET_PREPT=whsec_xxxxx`

---

## Error Handling

All error responses follow this format:

```json
{
  "error": "Human-readable error message"
}
```

**HTTP Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (invalid/missing API key) |
| 404 | Not Found |
| 500 | Server Error |

---

## Example Integration (TypeScript)

```typescript
// lib/invitation-service.ts

const INVITATION_SERVICE_URL = process.env.INVITATION_SERVICE_URL!
const INVITATION_API_KEY = process.env.INVITATION_API_KEY!

async function invitationRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${INVITATION_SERVICE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': INVITATION_API_KEY,
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

// Validate an invitation code
export async function validateCode(code: string) {
  return invitationRequest('/api/v1/codes/validate', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

// Redeem an invitation code (creates subscription)
export async function redeemCode(
  code: string,
  email: string,
  name?: string,
  externalId?: string
) {
  return invitationRequest('/api/v1/codes/redeem', {
    method: 'POST',
    body: JSON.stringify({
      code,
      email,
      name,
      external_id: externalId,
    }),
  })
}

// Create an invitation request (for trials)
export async function createInvitationRequest(
  email: string,
  name?: string,
  source?: string,
  referralCode?: string
) {
  return invitationRequest('/api/v1/requests', {
    method: 'POST',
    body: JSON.stringify({
      email,
      name,
      source,
      referral_code: referralCode,
    }),
  })
}

// Get member's referral data
export async function getMemberReferrals(memberId: string) {
  return invitationRequest(`/api/v1/members/${memberId}/referrals`)
}
```

---

## Example: Signup Flow with Invitation Code

```typescript
// app/api/signup/route.ts (Next.js example)

import { validateCode, redeemCode } from '@/lib/invitation-service'
import { createUser } from '@/lib/db'

export async function POST(request: Request) {
  const { email, password, name, invitationCode } = await request.json()

  // 1. Validate the invitation code
  const validation = await validateCode(invitationCode)
  if (!validation.valid) {
    return Response.json(
      { error: validation.error },
      { status: 400 }
    )
  }

  // 2. Create user in your database
  const user = await createUser({ email, password, name })

  // 3. Redeem the code (creates Stripe subscription)
  const redemption = await redeemCode(
    invitationCode,
    email,
    name,
    user.id  // Store correlation ID
  )

  // 4. Update user with member/subscription info
  await updateUser(user.id, {
    invitationMemberId: redemption.member.id,
    stripeCustomerId: redemption.member.stripe_customer_id,
    stripeSubscriptionId: redemption.member.stripe_subscription_id,
    subscriptionStatus: redemption.subscription.status,
    trialEndsAt: redemption.member.trial_ends_at,
  })

  // 5. Return success
  return Response.json({
    success: true,
    user: { id: user.id, email, name },
  })
}
```

---

## Example: Trial Signup (Auto-Approval)

```typescript
// For AgentPMO trial signups without invitation code

import { createInvitationRequest, redeemCode } from '@/lib/invitation-service'

export async function POST(request: Request) {
  const { email, password, name, referralCode } = await request.json()

  // 1. Create user in your database first
  const user = await createUser({ email, password, name })

  // 2. Create invitation request (auto-approved for trials)
  const invitation = await createInvitationRequest(
    email,
    name,
    'trial_signup',
    referralCode  // Optional: if they came from a referral link
  )

  if (invitation.status !== 'approved') {
    // Handle pending approval case
    return Response.json({
      success: true,
      pending: true,
      message: 'Your request is pending approval',
    })
  }

  // 3. Redeem the auto-generated code
  const redemption = await redeemCode(
    invitation.code,
    email,
    name,
    user.id
  )

  // 4. Update user with subscription info
  await updateUser(user.id, {
    invitationMemberId: redemption.member.id,
    stripeCustomerId: redemption.member.stripe_customer_id,
    stripeSubscriptionId: redemption.member.stripe_subscription_id,
  })

  return Response.json({ success: true })
}
```

---

## Referral Link Format

When displaying referral links in your app, use this format:

```
https://your-app.com/join?ref={REFERRAL_CODE}
```

The referral code is returned in:
- `POST /api/v1/codes/redeem` response: `member.referral_code`
- `GET /api/v1/members/{id}/referrals` response: `member.referral_code`

When a user signs up via referral link, pass the `ref` query parameter as `referral_code` in your invitation request.

---

## Environment Variables

Add these to your application:

```env
# Invitation Service
INVITATION_SERVICE_URL=https://your-invitation-service.vercel.app
INVITATION_API_KEY=your_api_key_from_admin_dashboard
```

---

## Support

For questions or issues, contact the Velorum platform team.
