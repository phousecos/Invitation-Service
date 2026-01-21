# Velorum Invitation Service - Design Updates

This document captures design clarifications and additions discussed during review of the v2.0 specification.

---

## 1. Stripe Webhook Integration

The service requires direct Stripe webhook integration to manage member status transitions (trial → active → churned). This was missing from the original specification.

### Webhook Endpoint

```
POST /api/v1/webhooks/stripe/{product_slug}
```

Each product (lumynr, agentpmo, prept) has its own webhook URL to route events to the correct Stripe account context.

### Handled Events

| Stripe Event | Service Action |
|--------------|----------------|
| `customer.subscription.created` | Create/update member record, set `status = 'trial'` if trial period exists |
| `customer.subscription.updated` | Update member status based on subscription state |
| `customer.subscription.deleted` | Set member `status = 'churned'` |
| `invoice.payment_succeeded` | Set `first_paid_at` if null, trigger referral qualification check |
| `invoice.payment_failed` | Flag for admin review (optional: suspend after X failures) |

### Webhook Security

- Verify Stripe signature using `STRIPE_WEBHOOK_SECRET_{PRODUCT}` environment variables
- Reject requests with invalid signatures
- Log all webhook events for debugging

### New Environment Variables

| Variable | Description |
|----------|-------------|
| `STRIPE_WEBHOOK_SECRET_LUMYNR` | Lumynr webhook signing secret |
| `STRIPE_WEBHOOK_SECRET_AGENTPMO` | AgentPMO webhook signing secret |
| `STRIPE_WEBHOOK_SECRET_PREPT` | Prept webhook signing secret |

---

## 2. Audit Logging

Track admin actions for accountability and debugging. Leverage Supabase's built-in features for data retention management.

### audit_logs Table Schema

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| created_at | timestamptz | When action occurred |
| admin_user_id | uuid | FK to admin users table |
| action_type | enum | Type of action performed |
| target_table | text | Table affected (e.g., 'invitation_requests', 'invitation_codes') |
| target_id | uuid | ID of affected record |
| details | jsonb | Additional context (before/after values, notes) |
| ip_address | inet | Admin's IP address (optional) |

### Action Types

```sql
CREATE TYPE audit_action AS ENUM (
  'request_approved',
  'request_rejected',
  'code_generated',
  'code_revoked',
  'member_suspended',
  'member_reactivated',
  'product_updated',
  'settings_changed'
);
```

### Retention Policy

Use Supabase's pg_cron extension to automatically purge audit logs older than a configurable retention period (suggested: 12 months). Example:

```sql
-- Run monthly to delete logs older than 12 months
SELECT cron.schedule(
  'purge-old-audit-logs',
  '0 0 1 * *',
  $$DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '12 months'$$
);
```

---

## 3. Referral Code Flow (Clarification)

The system has two distinct code concepts that work together:

### Member Referral Code (`members.referral_code`)

- **Purpose**: Shareable code a member gives to friends
- **Format**: Human-friendly, e.g., `JOHN-LUMYNR-2024` or `SMITH123`
- **Generated**: Automatically when a member record is created
- **Lifetime**: Persists as long as member exists
- **Validation**: Only works if member is `status = 'active'` (paying)

### Invitation Code (`invitation_codes` table)

- **Purpose**: Redeemable code that grants access to a product
- **Format**: System-generated, e.g., `LUM-XXXX-XXXX`
- **Generated**: When admin approves a request, or manually by admin
- **Lifetime**: Single-use, status changes to `redeemed` after use
- **Types**: `standard`, `referral`, `sales`

### Complete Referral Flow

```
1. Alice (active member) shares her referral code: ALICE-REF
   └── Source: alice.referral_code in members table

2. Bob visits Lumynr, enters ALICE-REF when submitting request
   └── invitation_requests.referred_by_code = 'ALICE-REF'

3. Admin reviews and approves Bob's request
   └── System generates invitation_code: LUM-AB12-CD34
   └── invitation_codes.code_type = 'referral'
   └── invitation_codes.issued_to_email = bob@example.com
   └── Email sent to Bob with his code

4. Bob redeems LUM-AB12-CD34 during signup
   └── invitation_codes.status = 'redeemed'
   └── members record created for Bob
   └── bob.referred_by_member_id = alice.id
   └── referrals record created linking Alice → Bob

5. Bob completes trial, pays, stays 30 days as paid member
   └── referrals.qualification_status = 'qualified'

6. After 7-day chargeback window
   └── System credits Alice's Stripe account $25
   └── referrals.reward_status = 'credited'
```

---

## 4. Invitation Code Status (Simplification)

### Original Statuses
- `active`, `redeemed`, `expired`, `revoked`

### Recommendation

Remove `expired` or merge with `revoked`. Rationale:

| Concern | Why Expiration Isn't Needed |
|---------|----------------------------|
| Referral codes | Protected by "referrer must be active" validation |
| Standard codes | Tied to `issued_to_email`, limits misuse |
| Stale codes | Inert data, no security or cost impact |
| Bad actors | Manual revocation handles edge cases |

### Revised Statuses

```sql
CREATE TYPE invitation_code_status AS ENUM (
  'active',    -- Code can be redeemed
  'redeemed',  -- Code has been used
  'revoked'    -- Code manually invalidated by admin
);
```

If time-limited promotions are added later, `expired` can be reintroduced with an `expires_at` column.

---

## 5. Design Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Manual referee uniqueness check | No automated fraud detection for v1; honor system approach | 2026-01 |
| 7-day qualification delay | Chargeback protection window; configurable per product | 2026-01 |
| Referrer churn during qualification | Not an issue—referee's paid period completes regardless of referrer status | 2026-01 |
| No code expiration | Unnecessary complexity; revocation handles edge cases | 2026-01 |
| Internal-only admin dashboard | No rate limiting needed on admin endpoints | 2026-01 |

---

## Appendix: Updated API Endpoints

### Original Endpoints (from v2.0 spec)
- `POST /api/v1/requests` - Submit invitation request
- `POST /api/v1/codes/validate` - Validate invitation code
- `POST /api/v1/codes/redeem` - Redeem invitation code
- `GET /api/v1/members/{member_id}/referrals` - Get referral stats
- `POST /api/v1/members/{member_id}/payment-success` - Record payment (deprecated by webhook)

### New Endpoints
- `POST /api/v1/webhooks/stripe/{product_slug}` - Stripe webhook receiver

### Deprecated
- `POST /api/v1/members/{member_id}/payment-success` - Replaced by Stripe webhook integration
