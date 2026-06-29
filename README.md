# Cardinal OS Markets Bible

Cardinal OS Markets is a multi-tenant SaaS business operating system for traders in Nigerian markets. It is separate from Cardinal OS Enterprise and is designed for self-serve onboarding: a trader signs up, configures their business, adds products, manages customers, takes orders, verifies payments, dispatches deliveries, and uses AI from one shared deployment with tenant-isolated data.

## Product Positioning

Cardinal OS Markets is for market traders and trading businesses in places like Alaba International and Trade Fair Complex.

The promise is simple: run orders, customers, products, payments, stock, dispatch, finance, and business intelligence from one workspace.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Database, RLS, Storage
- Anthropic Claude API
- OpenAI API support
- Paystack
- Termii SMS and WhatsApp
- Resend
- Vercel

## Tenant Model

Many businesses share one deployment. Every tenant has its own isolated data via `tenant_id` and Supabase RLS.

Each tenant has:

- business profile
- users and roles
- products
- customers
- orders
- payments
- deliveries
- bank accounts
- subscription status
- usage limits
- WhatsApp business brief settings

## Roles

`ceo` is the main owner role for a tenant and has full rights inside that organization.

Current roles:

- `ceo`: full rights for the business owner/founder
- `owner`: legacy full-rights alias kept for backwards compatibility
- `admin`: full operational/admin access
- `sales_agent`: customers, orders, payment submission, AI assistant
- `logistics`: orders, dispatch, products, incoming stock, pickup, payment submission
- `warehouse`: legacy operations role
- `finance`: finance dashboard and payment verification
- `rider`: rider-specific workflows
- `viewer`: limited viewing role

CEO/owner accounts cannot be demoted or deactivated from the Team screen.

## Core Modules

- War Room dashboard
- Customers
- Orders and new order flow
- Products and stock adjustments
- Submit Payment
- Finance overview
- Payment Queue
- Dispatch and delivery
- Public payment page
- Public tracking page
- Rider delivery confirmation page
- Company Brain
- AI Assistant
- Tasks
- Autopilot
- Performance
- Settings
- Bank accounts
- Subscription billing
- Association pages and association admin dashboard

## Payments

There are two separate Paystack flows.

### Subscription Billing

Tenants pay Stuart Davidson for Cardinal OS Markets.

This uses platform environment variables:

- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_WEBHOOK_SECRET`

Webhook:

- `/api/webhooks/paystack`

### Customer Payments

A tenant's customers pay the tenant for orders.

This uses tenant-specific Paystack keys stored on the tenant record:

- `tenants.paystack_public_key`
- encrypted `tenants.paystack_secret_key`
- encrypted `tenants.paystack_webhook_secret`

Tenant webhook:

- `/api/webhooks/paystack/[tenant_slug]`

Tenant Paystack secret values are encrypted before storage.

## Payment Verification

Staff submit payment proofs from Submit Payment.

Finance verifies or rejects proofs from Payment Queue.

Submitters can see their submitted payments and whether each proof is:

- pending
- approved
- rejected

Finance can view:

- Pending payments
- Approved payments
- All payments with filters

Duplicate payment references are blocked before verification.

## Subscription Tiers

Paid plans are high-limit, not unlimited. Unlimited AI and SMS are not offered by default because they can destroy margin unless tenants bring their own provider credits.

| Tier | Price | Staff | Customers | Products | Orders/month | AI/month | SMS/month | Autopilot actions/month |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Trial | ₦0 | Unlimited | Unlimited | Unlimited | Unlimited | 100 | 20 | 50 |
| Starter | ₦50,000 | 5 | 200 | 50 | 1,000 | 50 | 100 | 0 |
| Growth | ₦100,000 | 10 | 750 | 150 | 3,000 | 500 | 500 | 100 |
| Professional | ₦150,000 | 25 | 2,500 | 500 | 10,000 | 2,000 | 1,500 | 1,000 |

## Tier Feature Access

| Feature | Trial | Starter | Growth | Professional |
|---|---|---|---|---|
| Core modules | Yes | Yes | Yes | Yes |
| Incoming Stock | Yes | Yes | Yes | Yes |
| Store Pickup | Yes | Yes | Yes | Yes |
| Tasks | Yes | No | Yes | Yes |
| Autopilot Inbox | Yes | No | Yes | Yes |
| Autopilot Actions | Yes | No | Limited | Higher limit |
| Autopilot Promises | Yes | No | No | Yes |
| Performance Tracking | Yes | No | Yes | Yes |
| Activity Log | Yes | No | Yes | Yes |
| SMS Broadcasts | Yes | No | Yes, capped | Yes, capped |
| Reps View | Yes | No | Yes | Yes |
| Approvals | Yes | No | Yes | Yes |
| Association Dashboard | Yes | No | No | Yes |
| WooCommerce Sync | No | No | No | No |

## Usage Policy

Usage is tracked monthly via `usage_tracking`.

Current tracked metrics:

- `orders_this_month`
- `ai_queries`
- `sms_messages`
- `autopilot_actions`

SMS is costed at roughly ₦6 per SMS, so included SMS must remain capped unless a tenant connects their own SMS/WhatsApp provider credits.

Future provider-credit model:

- tenant-owned Termii key
- tenant-owned WhatsApp sender
- tenant-owned AI provider key if needed

## WhatsApp Business Briefs

Tenants can opt in to receive business summaries on WhatsApp.

Settings include:

- WhatsApp number
- enabled/disabled
- daily or weekly frequency
- preferred send time
- weekly send day
- test brief button

Cron route:

- `/api/cron/daily-brief`

Vercel cron runs hourly and the route decides which tenants are due based on their chosen time. Duplicate sends are prevented by `daily_brief_log`.

Required env vars:

- `TERMII_API_KEY`
- `TERMII_WHATSAPP_SENDER_ID`
- `TERMII_WHATSAPP_DAILY_BRIEF_TEMPLATE_ID`
- `CRON_SECRET`

Termii WhatsApp template:

```text
{{greeting}} {{business_name}}. {{brief_content}} View dashboard: {{dashboard_link}}
```

## Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_PUBLIC_KEY=
TERMII_API_KEY=
TERMII_WHATSAPP_SENDER_ID=
TERMII_WHATSAPP_DAILY_BRIEF_TEMPLATE_ID=
RESEND_API_KEY=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=https://markets.cardinal.stuartdavidson.org
NEXT_PUBLIC_APP_NAME=Cardinal OS Markets
```

## Deployment Notes

- Vercel deploys from `master`.
- Supabase migrations live in `supabase/migrations`.
- Public routes include login, signup, upgrade, payment, tracking, rider, association, and webhooks.
- `/app/*` routes require an authenticated active tenant user.
- Expired trial, cancelled, or suspended tenants are redirected to `/upgrade`.

## Verification Commands

```bash
npm run lint
npm run test
npm run build
```
