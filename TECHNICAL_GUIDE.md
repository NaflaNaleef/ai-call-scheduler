# AI Call Scheduler — Technical Documentation

**Version:** 1.0  
**Last Updated:** June 2026  
**Prepared by:** Development Team  
**Audience:** Internal Developers

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Tech Stack](#2-tech-stack)
3. [Infrastructure & Hosting](#3-infrastructure--hosting)
4. [Database Schema](#4-database-schema)
5. [Authentication & Security](#5-authentication--security)
6. [Edge Functions](#6-edge-functions)
7. [RPC Functions](#7-rpc-functions)
8. [Third Party Integrations](#8-third-party-integrations)
9. [Environment Variables](#9-environment-variables)
10. [Deployment Guide](#10-deployment-guide)
11. [Known Issues & Recommendations](#11-known-issues--recommendations)
12. [Role-Based Access Control](#12-role-based-access-control)
13. [Team Invitation Flow](#13-team-invitation-flow)

---

## 1. Overview & Architecture

### Project Overview

AI Call Scheduler is a multi-tenant SaaS platform that enables organisations to create, manage, and automate AI-powered outbound calling campaigns. The platform integrates with Bland AI to conduct real conversations with contacts, collect data, and report results — all without human intervention.

### Core Capabilities

```
✅ Contact management with group organisation
✅ Campaign creation with custom AI instructions
✅ Automated outbound calling via Bland AI
✅ Real-time call monitoring and transcripts
✅ Retry logic for unanswered/failed calls
✅ Scheduled and recurring campaigns
✅ Multi-tenant data isolation per organisation
✅ Subscription plans with usage enforcement
✅ Stripe billing integration (in progress)
```

### High Level Architecture

```
┌─────────────────────────────────────────┐
│           Frontend (React/TS)           │
│     Hosted on Render (Static Site)      │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│           Supabase Platform             │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  PostgreSQL  │  │  Edge Functions  │  │
│  │  Database   │  │  (Deno Runtime)  │  │
│  └─────────────┘  └──────────────────┘  │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  Auth       │  │  Realtime        │  │
│  │  (JWT/RLS)  │  │  (WebSocket)     │  │
│  └─────────────┘  └──────────────────┘  │
└──────────────────┬──────────────────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
┌──────────────┐   ┌────────────────┐
│   Bland AI   │   │    Stripe      │
│  (AI Calls)  │   │  (Billing)     │
└──────────────┘   └────────────────┘
```

### Data Flow

```
1. User creates campaign and adds contacts
2. User launches campaign
3. f_create_campaign_run RPC creates a run record
4. Trigger fires → prepare-campaign-calls edge function
5. Edge function fetches contacts and sends batch to Bland AI
6. Bland AI makes calls and fires webhooks per call
7. process-call-webhook edge function receives webhooks
8. Webhook updates call_logs, campaign_contacts, campaign_runs
9. Usage tracked via f_increment_usage RPC
10. Frontend updates in real-time via Supabase Realtime
```

---

## 2. Tech Stack

### Frontend

```
Framework:        React 18 with TypeScript
Build Tool:       Vite
Styling:          Tailwind CSS
UI Components:    shadcn/ui
Routing:          React Router v6
State Management: React Context (AuthContext)
HTTP Client:      Supabase JS SDK v2
Icons:            Lucide React
Development:      Antigravity (Lovable) AI IDE
```

### Backend

```
Platform:         Supabase
Database:         PostgreSQL (Supabase managed)
                  Region: Oceania (Sydney) ap-southeast-2
                  Compute: NANO (t4g.nano)
Edge Functions:   Deno runtime (TypeScript)
Auth:             Supabase Auth (JWT + custom hooks)
Realtime:         Supabase Realtime (WebSocket)
Scheduler:        pg_cron (PostgreSQL extension)
```

### Third Party Services

```
AI Calling:       Bland AI (batch calls API)
Payments:         Stripe (Checkout + Webhooks)
Hosting:          Render (Static Site, Global CDN)
```

### Database Extensions Used

```
pg_cron    → Monthly usage reset scheduled job
uuid-ossp  → UUID generation
pg_graphql → Installed but not used
```

### Key Dependencies

```
Frontend:
@supabase/supabase-js    → Supabase client
react-router-dom         → Client side routing
@tanstack/react-query    → Data fetching/caching
tailwindcss              → Utility CSS framework
lucide-react             → Icon library
recharts                 → Charts and graphs

Edge Functions (Deno):
supabase-js@2            → Supabase client
stripe@13.3.0            → Stripe SDK
std@0.168.0              → Deno standard library
```

---

## 3. Infrastructure & Hosting

### Hosting Overview

```
Frontend:    Render (Static Site)
Backend:     Supabase Cloud (managed)
Region:      Oceania (Sydney) — ap-southeast-2
CDN:         Render Global CDN
```

### Render Configuration

**Service Type:** Static Site  
**Service Name:** ai-call-scheduler  
**Production URL:** `https://ai-call-scheduler-7v9f.onrender.com`

**Environment Variables on Render:**
```
VITE_SUPABASE_URL      = https://eekzetzhlxhclerfdcmf.supabase.co
VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
```

**Build Configuration:**
```
Build Command:  npm run build
Publish Dir:    dist
```

### Supabase Configuration

**Project Name:** AI Call Scheduler  
**Project ID:** eekzetzhlxhclerfdcmf  
**Project URL:** `https://eekzetzhlxhclerfdcmf.supabase.co`  
**Region:** Oceania (Sydney) — ap-southeast-2  
**Compute:** NANO (t4g.nano)  
**Organisation:** AIA Labs Org  

**Supabase Auth Configuration:**
```
Auth Provider:        Email/Password ✅
OAuth Providers:      Google ✅
                      Microsoft Azure ⚠️ (pending Azure app registration)
Site URL:             https://ai-call-scheduler-7v9f.onrender.com
Redirect URLs:        https://ai-call-scheduler-7v9f.onrender.com/**
                      http://localhost:8080/**
Custom JWT Hook:      public.custom_access_token_hook
```

**Supabase Edge Function Secrets:**
```
SUPABASE_URL               → auto-injected
SUPABASE_SERVICE_ROLE_KEY  → auto-injected
BLAND_API_KEY              → Bland AI API key
STRIPE_SECRET_KEY          → Stripe secret key
STRIPE_WEBHOOK_SECRET      → Stripe webhook signing secret
APP_URL                    → https://ai-call-scheduler-7v9f.onrender.com
```

### Scheduled Jobs (pg_cron)

```
Job Name: monthly-usage-reset
Schedule: 0 0 1 * * (midnight on 1st of every month UTC)
Purpose:  Resets call_minutes_used and calls_made to 0
          Creates fresh org_usage record for new period
          Updates current_period_start/end in org_subscriptions
Note:     Will be replaced by Stripe webhook reset
          when billing goes live
```

### API Keys Status

```
Currently using (Legacy — valid until end of 2026):
SUPABASE_ANON_KEY         → eyJ... (legacy format)
SUPABASE_SERVICE_ROLE_KEY → eyJ... (legacy format)

Migration needed before end of 2026:
anon key        → sb_publishable_xxx
service_role    → sb_secret_xxx
```

### Recommended Actions Before Production

```
⚠️ Set up database backups
⚠️ Migrate from legacy API keys to new keys
⚠️ Connect GitHub repository to Supabase
⚠️ Upgrade Supabase compute from NANO to SMALL
```

---

## 4. Database Schema

### Overview

```
Database:    PostgreSQL (Supabase managed)
Schema:      public
Tables:      14
RLS:         Enabled on all 14 tables
Extensions:  pg_cron, uuid-ossp
```

### Entity Relationship

```
organizations (1)
    └── users (many)
    └── contacts (many)
    └── contact_groups (many)
    │       └── contact_group_members (many)
    └── campaigns (many)
    │       └── campaign_fields (many)
    │       └── campaign_runs (many)
    │               └── campaign_contacts (many)
    │               └── call_logs (many)
    └── org_subscriptions (1)
    └── org_usage (1 per billing period)

plans (reference data)
    └── org_subscriptions (many)

ai_webhooks (audit log)
    └── call_logs (1)
```

### Table Definitions

#### `organizations`
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
clerk_org_id text UNIQUE NOT NULL
name         text NOT NULL
email        text
timezone     text DEFAULT 'America/New_York'
phone_prefix text
created_by   uuid FK → users(id) ON DELETE SET NULL
updated_by   uuid FK → users(id) ON DELETE SET NULL
is_active    boolean DEFAULT true
created_at   timestamptz DEFAULT now()
updated_at   timestamptz DEFAULT now()
```

#### `users`
```sql
id             uuid PRIMARY KEY DEFAULT gen_random_uuid()
clerk_user_id  text UNIQUE NOT NULL
org_id         uuid NOT NULL FK → organizations(id) ON DELETE CASCADE
email          text NOT NULL
first_name     text
last_name      text
role           text DEFAULT 'member'
is_active      boolean DEFAULT true
created_at     timestamptz DEFAULT now()
updated_at     timestamptz DEFAULT now()

Indexes: idx_users_clerk_user_id, idx_users_org_id
```

#### `contacts`
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
org_id       uuid NOT NULL FK → organizations(id) ON DELETE CASCADE
first_name   text
last_name    text
phone_number text NOT NULL
email        text
timezone     text
metadata     jsonb
is_active    boolean DEFAULT true
created_by   uuid FK → users(id) ON DELETE SET NULL
updated_by   uuid FK → users(id) ON DELETE SET NULL
created_at   timestamptz DEFAULT now()
updated_at   timestamptz DEFAULT now()

Constraints: UNIQUE(org_id, phone_number)
Indexes: idx_contacts_org_id, idx_contacts_phone, idx_contacts_is_active
```

#### `contact_groups`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
org_id        uuid NOT NULL FK → organizations(id) ON DELETE CASCADE
name          text NOT NULL
description   text
contact_count integer DEFAULT 0
is_active     boolean DEFAULT true
created_by    uuid FK → users(id) ON DELETE SET NULL
updated_by    uuid FK → users(id) ON DELETE SET NULL
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()

Indexes: idx_contact_groups_org_id, idx_contact_groups_is_active
```

#### `contact_group_members`
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
group_id   uuid NOT NULL FK → contact_groups(id) ON DELETE CASCADE
contact_id uuid NOT NULL FK → contacts(id) ON DELETE CASCADE
created_at timestamptz DEFAULT now()

Constraints: UNIQUE(group_id, contact_id)
```

#### `campaigns`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
org_id              uuid NOT NULL FK → organizations(id)
created_by          uuid FK → users(id)
updated_by          uuid FK → users(id)
name                text NOT NULL
description         text
campaign_type       text DEFAULT 'collect'
greeting            text
instructions        text
status              text        -- DRAFT, LOCKED, COMPLETED, PAUSED
timezone            text
schedule_type       text        -- immediate, run_once, recurring
scheduled_start_at  timestamptz
call_start_time     time DEFAULT '09:00:00'
call_end_time       time DEFAULT '18:00:00'
days_of_week        text[]      -- [MON,TUE,WED,THU,FRI]
start_date          date
end_date            date
respect_timezone    boolean DEFAULT true
total_recipients    integer DEFAULT 0
target_contact_ids  uuid[]
contact_group_ids   uuid[]
is_active           boolean DEFAULT true
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
```

#### `campaign_fields`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
campaign_id uuid NOT NULL FK → campaigns(id) ON DELETE CASCADE
field_name  text NOT NULL
field_label text NOT NULL
description text
field_type  text NOT NULL     -- text, number, boolean, choice
is_required boolean DEFAULT false
created_by  uuid FK → users(id) ON DELETE SET NULL
updated_by  uuid FK → users(id) ON DELETE SET NULL
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

#### `campaign_runs`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
campaign_id     uuid NOT NULL FK → campaigns(id) ON DELETE CASCADE
status          text DEFAULT 'RUNNING'
                -- SCHEDULED, RUNNING, PAUSED, BLOCKED, COMPLETED, FAILED
started_at      timestamptz DEFAULT now()
completed_at    timestamptz
scheduled_at    timestamptz
total_contacts  integer
calls_attempted integer DEFAULT 0
calls_completed integer DEFAULT 0
calls_failed    integer DEFAULT 0
calls_pending   integer DEFAULT 0
batch_id        text
attempt_number  integer DEFAULT 1
parent_run_id   uuid FK → campaign_runs(id) ON DELETE SET NULL
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()

Constraints:
  UNIQUE(campaign_id) WHERE status = 'RUNNING'
  status must be uppercase

Triggers:
  trigger_auto_snapshot_on_run_start (AFTER INSERT OR UPDATE)
  trigger_prepare_campaign_calls (AFTER INSERT)
```

#### `campaign_contacts`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
campaign_id         uuid NOT NULL FK → campaigns(id) ON DELETE CASCADE
campaign_run_id     uuid FK → campaign_runs(id)
contact_id          uuid NOT NULL FK → contacts(id) ON DELETE CASCADE
phone_number        text NOT NULL
status              text DEFAULT 'PENDING'
                    -- PENDING, QUEUED, IN_PROGRESS, COMPLETED, SKIPPED, FAILED
started_calling_at  timestamptz
stopped_calling_at  timestamptz
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()

Constraints:
  UNIQUE(campaign_id, contact_id, campaign_run_id) WHERE campaign_run_id IS NOT NULL
  UNIQUE(campaign_id, contact_id) WHERE campaign_run_id IS NULL

Triggers:
  update_campaign_contacts_updated_at (BEFORE UPDATE)
```

#### `call_logs`
```sql
id                   uuid PRIMARY KEY DEFAULT gen_random_uuid()
campaign_id          uuid NOT NULL FK → campaigns(id) ON DELETE CASCADE
campaign_run_id      uuid FK → campaign_runs(id) ON DELETE SET NULL
campaign_contact_id  uuid FK → campaign_contacts(id) ON DELETE SET NULL
contact_id           uuid NOT NULL FK → contacts(id) ON DELETE CASCADE
ai_call_id           text UNIQUE
phone_number_called  text NOT NULL
status               text DEFAULT 'pending'
                     -- ANSWERED, FAILED, VOICEMAIL, BUSY, NO_ANSWER
attempt_number       integer DEFAULT 1
call_duration        integer           -- seconds
collected_data       jsonb
transcript_text      text
transcript_json      jsonb
recording_url        text
voicemail_detected   boolean DEFAULT false
avg_latency_ms       integer
created_at           timestamptz DEFAULT now()
updated_at           timestamptz DEFAULT now()

Indexes: idx_call_logs_campaign_id, idx_call_logs_contact_id,
         idx_call_logs_status, idx_call_logs_ai_call_id
```

#### `ai_webhooks`
```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
call_log_id      uuid FK → call_logs(id) ON DELETE SET NULL
ai_call_id       text
event_type       text
                 -- call_started, call_ended, latency, queue,
                 -- webhook_delivery_failed
status_code      integer
payload          jsonb NOT NULL
received_at      timestamptz DEFAULT now()
processed        boolean DEFAULT false
processing_error text
created_at       timestamptz DEFAULT now()

Indexes: idx_ai_webhooks_call_log_id, idx_ai_webhooks_ai_call_id,
         idx_ai_webhooks_processed
```

#### `plans`
```sql
id                         text PRIMARY KEY
name                       text NOT NULL
price_monthly              decimal DEFAULT 0
max_contacts               integer   -- -1 = unlimited
max_campaigns              integer   -- -1 = unlimited
max_call_minutes_per_month integer
max_team_members           integer   -- -1 = unlimited
max_contacts_per_run       integer   -- -1 = unlimited
max_retries                integer
allow_scheduling           boolean DEFAULT false
allow_recurring            boolean DEFAULT false
stripe_price_id            text
stripe_currency            text DEFAULT 'aud'
is_active                  boolean DEFAULT true
created_at                 timestamptz DEFAULT now()
updated_at                 timestamptz DEFAULT now()
```

**Seeded plan data:**
```
id        name      price   contacts  campaigns  minutes  members
free      Free      $0      50        3          60       1
starter   Starter   $29     500       10         500      3
pro       Pro       $79     2,000     50         2,000    10
business  Business  $199    unlimited unlimited  10,000   unlimited
```

#### `org_subscriptions`
```sql
id                      uuid PRIMARY KEY DEFAULT gen_random_uuid()
org_id                  uuid UNIQUE NOT NULL FK → organizations(id)
plan_id                 text NOT NULL FK → plans(id)
status                  text NOT NULL DEFAULT 'active'
                        -- active, cancelled, expired, trialing, past_due
stripe_customer_id      text
stripe_subscription_id  text
current_period_start    timestamptz DEFAULT now()
current_period_end      timestamptz DEFAULT now() + 1 month
created_at              timestamptz DEFAULT now()
updated_at              timestamptz DEFAULT now()
```

#### `org_usage`
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
org_id            uuid NOT NULL FK → organizations(id) ON DELETE CASCADE
period_start      timestamptz NOT NULL
period_end        timestamptz NOT NULL
calls_made        integer DEFAULT 0
call_minutes_used integer DEFAULT 0
contacts_count    integer DEFAULT 0
campaigns_count   integer DEFAULT 0
updated_at        timestamptz DEFAULT now()

Constraints: UNIQUE(org_id, period_start)
```

### Database Triggers Summary

```
trigger_auto_snapshot_on_run_start
  Table:    campaign_runs
  Event:    AFTER INSERT OR UPDATE
  Purpose:  Creates campaign_contacts snapshot on run start
            Skips for retry runs (parent_run_id IS NOT NULL)

trigger_prepare_campaign_calls
  Table:    campaign_runs
  Event:    AFTER INSERT
  Purpose:  Fires prepare-campaign-calls edge function
            when new run status = RUNNING

update_campaign_contacts_updated_at
  Table:    campaign_contacts
  Event:    BEFORE UPDATE
  Purpose:  Auto-updates updated_at timestamp

handle_new_user
  Table:    auth.users
  Event:    AFTER INSERT
  Purpose:  Auto-creates organization and user on signup
```

---

## 5. Authentication & Security

### Authentication Overview

```
Provider:        Supabase Auth
Method:          Email/Password (primary)
OAuth:           Google, Microsoft Azure (configured)
Session Storage: sessionStorage (sb-session key)
JWT:             Custom claims via Auth Hook
```

### Auth Flow

```
1. User enters email/password
2. Supabase Auth validates credentials
3. custom_access_token_hook fires →
   reads org_id from users table →
   injects org_id into JWT claims
4. JWT stored in sessionStorage as 'sb-session'
5. All subsequent requests include JWT
6. RLS policies read org_id from JWT →
   filter data automatically
```

### JWT Structure

```json
{
  "sub": "70a197f9-7fe1-4e75-9791-f9bf878d62c4",
  "email": "user@example.com",
  "role": "authenticated",
  "org_id": "99ad1430-c64f-4a87-9c72-61a620f8a4f9",
  "aal": "aal1",
  "exp": 1234567890
}
```

### Custom Access Token Hook

```sql
Function: public.custom_access_token_hook(event jsonb)
Trigger:  Supabase Auth → Hooks → Custom Access Token Hook
Purpose:  Injects org_id into JWT claims
Security: SECURITY DEFINER
          Granted to supabase_auth_admin only
```

### Auth Providers

```
Email/Password:  ✅ Working
Google OAuth:    ⚠️ Configured, redirect URLs pending
Microsoft Azure: ⚠️ Configured, Azure app registration needed
                 Client ID: 3770a2ce-58c3-4d6f-aaa3-c6dacc9a4e4f
```

### Auth Configuration

```
Site URL:      https://ai-call-scheduler-7v9f.onrender.com
Redirect URLs: https://ai-call-scheduler-7v9f.onrender.com/**
               http://localhost:8080/**
               ⚠️ Must be added in Supabase Dashboard
```

### Auth Pages

```
/sign-in          → Login page
/sign-up          → Registration page
/forgot-password  → Request password reset email
/reset-password   → Set new password
/auth/callback    → OAuth callback handler
```

### AuthContext

**Location:** `src/contexts/AuthContext.tsx`

```typescript
// Provides to entire app:
user              // AuthUser object
isAuthenticated   // boolean
loading           // boolean
subscription      // OrgSubscription object (real-time)
subscriptionLoading
login()
loginWithOAuth()
signUp()
logout()
refreshUser()
refreshSubscription()
```

### Row Level Security (RLS)

All 14 tables have RLS enabled.

**Helper function:**
```sql
public.get_org_id()
→ Returns (auth.jwt() ->> 'org_id')::uuid
→ Reads org_id from JWT — no extra DB query
```

**Policy summary:**
```
organizations          → org_id = get_org_id()
users                  → org_id = get_org_id()
contacts               → org_id = get_org_id()
contact_groups         → org_id = get_org_id()
contact_group_members  → via contact_groups JOIN
campaigns              → org_id = get_org_id()
campaign_runs          → via campaigns JOIN
campaign_contacts      → via campaigns JOIN
campaign_fields        → via campaigns JOIN
call_logs              → via campaigns JOIN
org_subscriptions      → org_id = get_org_id()
org_usage              → org_id = get_org_id()
plans                  → SELECT true (public read)
ai_webhooks            → USING false (service role only)
```

---

## 6. Edge Functions

### Overview

```
Runtime:    Deno (TypeScript)
Platform:   Supabase Edge Functions
Auth:       Service Role key (bypasses RLS)
Total:      9 active edge functions
```

### Function 1 — `prepare-campaign-calls`

**Purpose:** Fetches campaign data and sends batch to Bland AI.

**Triggered by:**
- Campaign trigger on new run
- pg_cron scheduler (scheduled mode)
- Direct HTTP call

**Flow (Normal mode):**
```
→ Check call minutes limit (f_check_org_limit)
→ If limit reached:
    Set campaign_run.status = BLOCKED
    For non-recurring campaigns: also set campaign.status = PAUSED
    Return 403 with { blocked: true, reason: "..." }
→ Fetch PENDING contacts for the run
→ Build Bland AI batch payload
→ Send batch to Bland AI v2/batches/create
→ Save batch_id to campaign_run
→ Mark all contacts as QUEUED
→ If recurring → create next scheduled run
```

**Language model:** The batch payload uses `language: 'fluent'` to enable Bland AI's Fluent transcription model. Fluent provides ~27% fewer transcription errors compared to the standard model, better turn detection (agent waits correctly when user pauses mid-thought), and supports 6 languages with automatic language detection (English, Spanish, German, French, Portuguese, Italian). Falls back to Auto model if Fluent encounters any issues. No extra cost.

### Function 2 — `process-call-webhook`

**Purpose:** Receives Bland AI webhooks after each call.

**Triggered by:** Bland AI (external)

**Events handled:** queue, latency, webhook, call_started, call_ended

**Call status logic:**
```typescript
ANSWERED  → status=completed AND (answered_by=human OR
            (answered_by=unknown AND hasData))
VOICEMAIL → answered_by=voicemail
BUSY      → error includes 'busy'
NO_ANSWER → error includes 'temporarily unavailable'
FAILED    → all other cases
```

**After each call:**
```
→ Create/update call_log
→ Update campaign_contact status
→ Update campaign_run counters
→ If calls_pending = 0 → mark run COMPLETED
→ Call f_increment_usage (calls + minutes)
→ If org has stripe_metered_item_id set → report usage to Stripe
  (non-fatal: logged but does not fail webhook processing)
→ Save audit log to ai_webhooks
```

### Function 3 — `send-invite`

**Purpose:** Sends a team member invitation via Supabase Auth admin API.

**Triggered by:** Frontend (Profile → Team Members → Invite Member)

**Flow:**
```
→ Validate caller is an org admin (role = 'admin')
→ Check email doesn't already exist in the system
  (one account per email globally — reject duplicates)
→ Call supabaseAdmin.auth.admin.inviteUserByEmail()
  with org_id and role injected into user_metadata
→ Supabase sends invitation email with magic link
→ handle_new_user trigger reads metadata on signup
  → joins existing org as 'member' instead of creating new org
```

**Security:** Caller must have role = 'admin'. Service Role key used server-side only — never exposed to frontend.

**Known behaviour:** Supabase creates the `auth.users` row immediately when the invite is sent (not when accepted). The user appears in the `users` table before accepting — `last_sign_in_at` is null until they actually log in.

**Re-invite behaviour:** If the invited email belongs to a soft-deleted member of the same org (is_active = false), the function reactivates them (sets is_active = true) instead of sending a new invite email. Returns `reactivated: true` in the response.

---

### Function 4 — `manage-member`

**Purpose:** Handles two team member management actions for org admins.

**Triggered by:** Frontend (Profile → Team Members → Revoke or Remove button)

**Actions:**

```
revoke:
  Cancels a pending invitation.
  Deletes from public.users first, then calls
  supabaseAdmin.auth.admin.deleteUser() to remove from auth.users entirely.
  This invalidates the invite token immediately.
  The email is freed and can be re-invited.

remove:
  Soft-deletes an active member.
  Sets public.users.is_active = false.
  Calls supabaseAdmin.auth.admin.signOut(id, 'global') to invalidate
  all active sessions.
  Auth account is preserved — member can be re-activated by re-inviting
  the same email (send-invite detects the soft-deleted record and
  reactivates instead of sending a new invite email).
```

**Security checks:**
```
- Caller must be org admin
- Target must be in the same org
- Cannot remove another admin
- Cannot remove yourself
```

**Request body:** `{ action, user_id, auth_user_id }`

**Security:** Caller must have role = 'admin'. Service Role key used server-side only — never exposed to frontend.

---

### Function 5 — `create-setup-intent`

**Purpose:** Creates a Stripe SetupIntent so a free plan user can save a card without an upfront charge.

**Triggered by:** Frontend (AddPaymentMethodDialog — when free plan user tries to launch a campaign with exhausted minutes)

**Flow:**
```
→ Look up or create Stripe customer for the org
→ Save stripe_customer_id to org_subscriptions
→ Create Stripe SetupIntent
→ Return client_secret to frontend
→ Frontend uses Stripe Elements to collect card and confirm setup
```

**CORS Headers required:**
```
authorization, x-client-info, apikey, content-type
```

---

### Function 6 — `confirm-payment-method`

**Purpose:** Completes the free plan card setup after a Stripe SetupIntent succeeds. Called by the frontend immediately after the user successfully saves their card via Stripe Elements.

**Triggered by:** `AddPaymentMethodDialog` component after `stripe.confirmCardSetup()` succeeds.

**Flow:**
```
→ Verifies caller JWT
→ Gets org's stripe_customer_id from org_subscriptions
→ Attaches the payment method to the Stripe customer
  via stripe.paymentMethods.attach()
→ Sets it as the default payment method on the customer
  (invoice_settings.default_payment_method)
→ If a subscription exists, also sets it as default
  on the subscription
→ Returns success
```

**Why needed:** Stripe's SetupIntent saves card details but does not automatically attach the card to the customer or set it as default for future invoices. This function completes that step so Stripe knows which card to charge at end of month for metered usage.

**Request body:** `{ payment_method_id: string }`

**CORS Headers required:**
```
authorization, x-client-info, apikey, content-type
```

---

### Function 7 — `get-invoices`

**Purpose:** Fetches the organisation's invoice history from Stripe.

**Triggered by:** Subscriptions page on load.

**Flow:**
```
→ Verifies caller JWT
→ Gets org's stripe_customer_id from org_subscriptions
→ If no customer → returns empty list { invoices: [] }
→ Calls stripe.invoices.list({ customer })
→ Returns last 24 invoices with:
    id, date (Unix timestamp), amount (cents),
    currency, status (paid/open/draft),
    pdf_url, hosted_invoice_url
→ Frontend formats and displays in Billing History
  table with download button
```

**CORS Headers required:**
```
authorization, x-client-info, apikey, content-type
```

---

### Function 8 — `create-checkout-session`

**Purpose:** Creates Stripe checkout session for plan upgrades.

**Triggered by:** Frontend (upgrade button click)

**Flow:**
```
→ Fetch plan stripe_price_id and stripe_metered_price_id
→ Create/reuse Stripe customer
→ Create checkout session (AUD, subscription mode)
  with two line items: flat recurring price + metered usage price
→ Return checkout URL to frontend
```

**Saves on completion:** `stripe_metered_item_id` (subscription item ID for the metered price) is captured in `stripe-webhook` on `checkout.session.completed` and stored in `org_subscriptions`. Used by `process-call-webhook` to report per-call usage to Stripe.

**CORS Headers required:**
```
authorization, x-client-info, apikey, content-type
```

### Function 9 — `stripe-webhook`

**Purpose:** Handles Stripe payment events.

**Triggered by:** Stripe (after payment events)

**Events handled:**
```
checkout.session.completed  → update plan + save customer IDs
                              + save stripe_metered_item_id from subscription items
invoice.payment_succeeded   → reset usage + resume campaigns
invoice.payment_failed      → mark as past_due
customer.subscription.deleted → downgrade to free
```

**Security:** Stripe signature verification on every request.

---

## 7. RPC Functions

### Overview

```
Total:     83 functions
Language:  PL/pgSQL
Schema:    public
Naming:    f_ prefix convention
```

### Contact Management

| Function | Arguments | Purpose |
|---|---|---|
| f_create_contact | p_org_id, p_first_name, p_last_name, p_phone_number, p_email, p_created_by | Creates contact with plan limit check. SECURITY DEFINER. |
| f_update_contact | p_id, p_first_name, p_last_name, p_phone_number, p_email, p_timezone | Updates active contact. COALESCE pattern. |
| f_deactivate_contact | p_id | Soft delete (is_active = false). |
| f_reactivate_contact | p_id | Restores deactivated contact. |
| f_get_contacts | p_org_id | All org contacts ordered by created_at DESC. |
| f_get_contact_by_id | p_id | Single contact with metadata. |
| f_get_contact_call_history | p_contact_id, p_limit | Call history across all campaigns. |
| f_get_contact_group_memberships | p_contact_id | All groups a contact belongs to. |

### Contact Groups

| Function | Arguments | Purpose |
|---|---|---|
| f_create_contact_group | p_org_id, p_name, p_description, p_created_by | Creates group. |
| f_update_contact_group | p_id, p_name, p_description, p_updated_by | Updates active group. |
| f_deactivate_contact_group | p_id | Soft delete. |
| f_reactivate_contact_group | p_id | Restores group. |
| f_get_contact_groups | p_org_id | All org groups. |
| f_get_contact_group_by_id | p_id | Single group. |
| f_get_group_contacts | p_group_id | All contacts in group. |
| f_add_contact_to_group | p_group_id, p_contact_id | Adds contact, updates contact_count. Idempotent. |
| f_remove_contact_from_group | p_group_id, p_contact_id | Removes contact, updates contact_count. |

### Campaign Management

| Function | Arguments | Purpose |
|---|---|---|
| f_create_campaign | p_org_id, p_created_by, p_name, ... | Creates campaign. Checks LOCKED limit, scheduling/recurring permissions. SECURITY DEFINER. |
| f_update_campaign | p_id, p_name, p_description, ... | Updates campaign. Blocks if run is active. |
| f_deactivate_campaign | p_id | Deactivates campaign. Pauses SCHEDULED runs. |
| f_reactivate_campaign | p_id | Reactivates. Creates next scheduled run for recurring. |
| f_get_campaigns | p_org_id | All org campaigns with schedule fields. |
| f_get_campaign_by_id | p_id | Single campaign (SETOF, SQL language). |
| f_get_campaign_draft_stats | p_campaign_id | Contact counts for draft campaigns. |
| f_preview_campaign_contacts | p_campaign_id | Preview contacts from linked groups. |
| f_add_contacts_to_campaign | p_campaign_id, p_contact_ids | Sets target_contact_ids array. |
| f_add_contact_group_to_campaign | p_campaign_id, p_contact_group_id | Appends to contact_group_ids. Idempotent. |
| f_add_group_contacts_to_campaign | p_campaign_id, p_group_id | Merges group contacts into target list. |
| f_add_multiple_groups_to_campaign | p_campaign_id, p_contact_group_ids | Bulk group add. Returns JSON stats. |
| f_remove_contact_from_campaign | p_campaign_id, p_contact_id | Removes from target_contact_ids. |
| f_remove_contact_group_from_campaign | p_campaign_id, p_contact_group_id | Removes group and its contacts from campaign. |

### Campaign Fields

| Function | Arguments | Purpose |
|---|---|---|
| f_create_campaign_field | p_campaign_id, p_field_name, p_field_label, p_description, p_field_type, p_is_required, p_created_by | Creates single field. Validates type. |
| f_bulk_create_campaign_fields | p_campaign_id, p_fields (JSON), p_created_by | Creates multiple fields atomically. |
| f_update_campaign_field | p_id, optional fields... | Updates field. |
| f_delete_campaign_field | p_id | Permanently deletes field. Returns JSON. |
| f_get_campaign_fields_by_campaign_id | p_campaign_id | All fields ordered by created_at. |
| f_get_campaign_field_by_id | p_id | Single field. |

### Campaign Runs

| Function | Arguments | Purpose |
|---|---|---|
| f_create_campaign_run | p_camp_id, p_initial_status, p_scheduled_at | Launches campaign. Checks limit on first launch (DRAFT→LOCKED). Skips check for recurring/retry. |
| f_create_retry_run | p_campaign_run_id | Creates retry. Max 3 attempts. Copies non-COMPLETED contacts. |
| f_complete_campaign_run | p_id | Manually completes run. Also marks campaign COMPLETED. |
| f_get_campaign_runs | p_campaign_id | All runs for a campaign. |
| f_get_org_campaign_runs | p_org_id | All runs across org with schedule info. |
| f_get_campaign_run_by_id | p_id | Single run. |
| f_get_active_campaign_run | p_campaign_id | Current RUNNING/SCHEDULED/PAUSED run. SECURITY DEFINER. |
| f_get_due_scheduled_runs | none | Runs ready to fire. Used by edge function. SECURITY DEFINER. |
| f_get_campaign_runs_grouped | p_org_id | Campaigns with run summary. SECURITY DEFINER. |
| f_update_campaign_run_status | p_id, counters... | Updates counters after each webhook. |
| f_start_campaign_run | p_run_id | Transitions DRAFT → RUNNING. |

### Campaign Contacts

| Function | Arguments | Purpose |
|---|---|---|
| f_bulk_create_campaign_contacts | p_campaign_id, p_campaign_run_id | Creates contact snapshot for run. Called by trigger. |
| f_create_campaign_contact | p_campaign_id, p_campaign_run_id, p_contact_id, p_phone_number | Creates single contact record. |
| f_get_campaign_contacts | p_campaign_id, p_campaign_run_id, p_status, p_limit, p_offset | Contacts with contact details joined. |
| f_get_campaign_contact_stats | p_campaign_id, p_campaign_run_id | Completion statistics. |
| f_update_campaign_contact_status | p_id, p_status | Updates contact status. |

### Call Logs

| Function | Arguments | Purpose |
|---|---|---|
| f_create_call_log | p_campaign_id, p_campaign_run_id, p_campaign_contact_id, p_contact_id, p_ai_call_id, p_phone_number_called, p_status, p_attempt_number | Creates call log. Called by webhook. |
| f_update_call_log | p_id, optional fields... | Updates with results. COALESCE pattern. |
| f_get_call_log_by_id | p_id | Single call log. |
| f_get_call_log_by_ai_call_id | p_ai_call_id | By Bland AI call ID. Used for deduplication. |
| f_get_call_logs | p_campaign_id, p_campaign_run_id, p_contact_id, p_status, p_limit, p_offset | Filtered call logs with contact details. |
| f_get_org_call_logs | p_org_id, p_limit, p_offset | All org call logs with campaign and contact names. |
| f_get_call_logs_stats | p_campaign_run_id | Aggregated stats per run. |

### AI Webhooks

| Function | Arguments | Purpose |
|---|---|---|
| f_create_ai_webhook | p_call_log_id, p_ai_call_id, p_event_type, p_payload, p_status_code | Creates webhook audit record. SECURITY DEFINER. |
| f_get_ai_webhooks | optional filters, p_limit, p_offset | Filtered webhook list. SECURITY DEFINER. |
| f_get_ai_webhook_by_id | p_id | Single webhook. SECURITY DEFINER. |
| f_get_ai_webhook_by_ai_call_id | p_ai_call_id, p_event_type | By Bland call ID. SECURITY DEFINER. |
| f_mark_webhook_processed | p_id, p_processing_error | Marks processed or failed. SECURITY DEFINER. |
| f_get_webhook_stats | p_campaign_run_id | Processing statistics per run. SECURITY DEFINER. |
| f_process_webhook | p_webhook_id | Legacy manual reprocessing. SECURITY DEFINER. |

### Organisations & Users

| Function | Arguments | Purpose |
|---|---|---|
| f_create_organization | p_clerk_org_id, p_name, p_email | Creates org. Called by handle_new_user trigger. |
| f_get_organizations | none | Returns current user's org only (JWT filtered). |
| f_super_admin_get_all_orgs | none | SECURITY DEFINER. Checks caller email = `superadmin@aialabs.com`. Returns all orgs across the platform with flattened usage and subscription data. Used by Super Admin page for cross-org platform visibility. |
| f_super_admin_update_org | p_org_id uuid, p_name text, p_plan_id text, p_is_active boolean, p_reset_usage boolean | SECURITY DEFINER. Verifies caller email = `superadmin@aialabs.com`. Updates org name and is_active in organizations table, plan_id in org_subscriptions, and optionally resets all org_usage counters to 0 when p_reset_usage = true. Database only — does not affect Stripe. EXECUTE revoked from anon. |
| f_get_org_members_with_status | p_org_id uuid | Returns org members joined with auth.users. Returns: id, auth_user_id, email, first_name, last_name, role, is_active, created_at, last_sign_in_at, invite_status ('pending'/'active'/'inactive'). invite_status is 'pending' when last_sign_in_at IS NULL, 'inactive' when is_active = false, 'active' otherwise. EXECUTE revoked from anon. |
| f_get_organization_by_id | p_id | Single org. |
| f_update_organization | p_id, p_name, p_email, p_timezone | Updates active org. |
| f_deactivate_organization | p_id | Deactivates org. |
| f_reactivate_organization | p_id | Reactivates org. |
| f_create_user | p_clerk_user_id, p_org_id, p_email, p_first_name, p_last_name | Creates user. Called by trigger. |
| f_update_user | p_id, p_email, p_first_name, p_last_name, p_role | Updates active user. |
| f_deactivate_user | p_id | Deactivates user. |
| f_reactivate_user | p_id | Reactivates user. |
| f_get_users | p_org_id | All org users. |
| f_get_user_by_id | p_id | Single user. |

### Subscriptions & Usage

| Function | Arguments | Purpose |
|---|---|---|
| f_get_org_subscription_and_usage | p_org_id | Complete plan + usage data. Live counts for contacts and campaigns. Return columns include `overage_rate_per_minute` from the plans table. |
| f_check_org_limit | p_org_id, p_action | Checks if action allowed. Actions: add_contact, add_campaign, make_call. For make_call: free plan with no stripe_customer_id → blocked at minute limit; free plan with stripe_customer_id (card on file) → allowed beyond limit at PAYG rate; paid plans → always allowed up to their limit. |
| f_increment_usage | p_org_id, p_calls_made, p_call_minutes, p_contacts, p_campaigns | Atomically increments usage. Upsert pattern. |

### Trigger Functions

| Function | Purpose |
|---|---|
| f_trigger_auto_snapshot_on_run_start | Creates contact snapshot when run starts. Skips retry runs. |
| f_trigger_prepare_campaign_calls | Fires prepare-campaign-calls HTTP when run = RUNNING. Reads service role key from Supabase Vault (`vault.decrypted_secrets`, secret name `service_role_key`) — no longer hardcoded. EXECUTE revoked from anon and authenticated; only the trigger itself invokes it. |

---

## 8. Third Party Integrations

### Bland AI

**Website:** https://bland.ai  
**API Base:** https://api.bland.ai  
**Auth:** `authorization: BLAND_API_KEY` header

**Transcription model:** Fluent (as of July 2026)
```
→ Word error rate: ~5.9% (vs 8.1% industry standard)
→ Supported languages: English, Spanish, German, French, Portuguese, Italian
→ Auto language detection enabled
→ Configured via language: 'fluent' in the batch payload global object
```

#### Batch Calls API

**Endpoint:** `POST https://api.bland.ai/v2/batches/create`

**Batch payload:**
```json
{
  "global": {
    "task": "instructions + fields",
    "language": "fluent",
    "analysis_schema": { "field_name": { "type": "string" } },
    "webhook": "https://project.supabase.co/functions/v1/process-call-webhook",
    "record": true,
    "max_duration": 2,
    "wait_for_greeting": true,
    "voicemail_action": "leave_message",
    "voicemail_message": "Hi, we tried to reach you..."
  },
  "call_objects": [
    {
      "phone_number": "+61XXXXXXXXX",
      "metadata": { "campaign_id": "uuid", "contact_id": "uuid",
                    "campaign_contact_id": "uuid", "campaign_run_id": "uuid" }
    }
  ]
}
```

#### Phone Number Format

```
Required: E.164 format, any country (not restricted to Australia)
Examples: +61412345678 (Australia), +94771234567 (Sri Lanka)
Regex: /^\+[1-9]\d{7,14}$/
```

#### Known Behaviours

```
Invalid numbers    → webhook may not fire → contact stuck as QUEUED
Disconnected       → webhook fires with answered_by=unknown → FAILED
AI-to-AI calls     → loop until max_duration → no data → FAILED
Voicemail          → auto-detected → leaves message → contact stays PENDING
```

### Stripe

**Website:** https://stripe.com  
**API Version:** 2023-10-16  
**Currency:** AUD  
**Mode:** Test (live pending)

#### Webhook URL

```
https://eekzetzhlxhclerfdcmf.supabase.co/functions/v1/stripe-webhook
```

#### Events Registered

```
checkout.session.completed
invoice.payment_succeeded
invoice.payment_failed
customer.subscription.deleted
```

#### Test Cards

```
Success:   4242 4242 4242 4242
Declined:  4000 0000 0000 0002
3DS:       4000 0025 0000 3155
```

#### Go Live Checklist

```
⏳ Replace test keys with live keys
⏳ Register webhook in Stripe live mode
⏳ Create products in Stripe live mode
⏳ Update plans table with live price IDs
⏳ Disable pg_cron monthly reset
⏳ Test with real card
```

---

## 9. Environment Variables

### Frontend (Render + local .env)

```
VITE_SUPABASE_URL
  Value:   https://eekzetzhlxhclerfdcmf.supabase.co
  Purpose: Supabase project URL
  Safe to expose: Yes (public URL)

VITE_SUPABASE_ANON_KEY
  Value:   eyJ... (legacy anon key)
  Purpose: Supabase client initialisation
  Safe to expose: Yes (protected by RLS)
  ⚠️ Migrate to sb_publishable_xxx before end of 2026
```

### Edge Function Secrets (Supabase)

```
SUPABASE_URL               → auto-injected
SUPABASE_SERVICE_ROLE_KEY  → auto-injected ⚠️ migrate before end 2026
BLAND_API_KEY              → Bland AI key ⚠️ never expose to frontend
STRIPE_SECRET_KEY          → Stripe secret key ⚠️ never expose to frontend
STRIPE_WEBHOOK_SECRET      → Stripe webhook signing secret
APP_URL                    → https://ai-call-scheduler-7v9f.onrender.com
```

### Local .env Setup

```bash
cp .env.example .env
# Edit .env:
VITE_SUPABASE_URL=https://eekzetzhlxhclerfdcmf.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Accessing Variables in Code

```typescript
// Frontend
const url = import.meta.env.VITE_SUPABASE_URL

// Edge Functions
const key = Deno.env.get('BLAND_API_KEY')!
```

---

## 10. Deployment Guide

### Prerequisites

```
Node.js      → v18 or higher
npm          → v9 or higher
Supabase CLI → latest version
```

```bash
# Install Supabase CLI
npm install -g supabase
supabase --version
```

### Local Development

```bash
git clone <repository-url>
cd ai-call-scheduler
npm install
cp .env.example .env
# Edit .env with your keys
npm run dev
# App runs at http://localhost:8080
```

### Frontend Deployment (Render)

```
Build Command:  npm run build
Publish Dir:    dist
Branch:         main (auto-deploy on push)
```

```bash
# Deploy
git add .
git commit -m "message"
git push origin main
```

### Edge Function Deployment (Supabase)

```bash
supabase login
supabase link --project-ref eekzetzhlxhclerfdcmf

# Deploy single function
supabase functions deploy prepare-campaign-calls
supabase functions deploy process-call-webhook
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook

# Deploy all
supabase functions deploy
```

### Schema Changes Checklist

```
When creating new table:
□ ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
□ CREATE POLICY ... ON new_table ...
□ GRANT SELECT, INSERT, UPDATE, DELETE
  ON new_table TO authenticated, anon, service_role;

When creating new RPC:
□ Add SET search_path = public
□ Add SECURITY DEFINER only if cross-org access needed
□ Test with authenticated user
```

### Production Go-Live Checklist

```
Security:
□ Add redirect URLs to Supabase Auth
□ Fix password reset flow
□ Migrate legacy API keys
□ Fix hardcoded service role key in trigger
□ Add SET search_path = public to all functions
□ Set up database backups

Infrastructure:
□ Upgrade Supabase compute from NANO to SMALL
□ Connect GitHub to Supabase
□ Configure monitoring

Stripe:
□ Switch to live keys
□ Register webhook in live mode
□ Create live products and price IDs
□ Disable pg_cron monthly reset

Testing:
□ Fresh account signup
□ Add contacts and verify limits
□ Launch campaign and verify calls
□ Test Stripe payment
□ Verify RLS isolation
□ Test password reset and OAuth
```

### Rollback Procedures

```
Frontend:   Render Dashboard → Deploys → select previous → Rollback
Edge Func:  git checkout <prev-commit> → redeploy → git checkout main
Database:   No automated rollback — keep rollback SQL ready
```

---

## 11. Known Issues & Recommendations

### Resolved ✅

| # | Issue | Resolution |
|---|---|---|
| 1 | Hardcoded service role key in f_trigger_prepare_campaign_calls | Moved to Supabase Vault (`vault.create_secret`). Function reads key via `vault.decrypted_secrets` at runtime. Verified: campaign launch and webhook receipt still work end to end. |
| 2 | 130 search path warnings | All public functions updated with `SET search_path = public`. Verified clean in Security Advisor. |
| 3 | Auth redirect URLs not configured | Added `https://ai-call-scheduler-7v9f.onrender.com/**` and `http://localhost:8080/**` in Supabase → Auth → URL Configuration. |
| 4 | Password reset broken on production ("Not Found") | Root cause was Render static hosting not rewriting client-side routes. Fixed permanently via `render.yaml` with a rewrite rule (`/*` → `/index.html`). Verified working after redeploy. |
| 5 | Remember Me not persisting across browser close | Confirmed working after testing — session correctly persists when checked. |
| 6 | Google OAuth redirect_uri_mismatch | Added Supabase callback URL (`https://eekzetzhlxhclerfdcmf.supabase.co/auth/v1/callback`) to Google Cloud Console authorised redirect URIs. Verified working. |
| 7 | anon role could execute 13 backend-only SECURITY DEFINER functions via REST API | Revoked `EXECUTE` from `anon` on: `f_create_ai_webhook`, `f_get_ai_webhook_by_ai_call_id`, `f_get_ai_webhook_by_id`, `f_get_ai_webhooks`, `f_get_campaign_runs_grouped`, `f_get_due_scheduled_runs`, `f_get_webhook_stats`, `f_mark_webhook_processed`, `f_process_webhook`, `f_trigger_prepare_campaign_calls`, `get_user_organization_id`, `handle_new_user`, `user_has_role`. Verified via `information_schema.routine_privileges` (zero rows for anon afterward). Note: the first revoke attempt did not persist for `anon` and had to be re-run — confirm with the verification query below if repeating this fix elsewhere. |
| 8 | authenticated role had unnecessary execute access on 14 backend-only functions | Revoked `EXECUTE` from `authenticated` on the same 13 functions above plus `custom_access_token_hook`. Kept `authenticated` access on `f_create_campaign`, `f_create_contact`, and `f_get_active_campaign_run` — these are genuinely called from the frontend. Verified via `information_schema.routine_privileges`. |
| 9 | Campaign limit loophole (unlimited DRAFT campaigns bypassing plan limit) | Fixed in `f_create_campaign_run` — checks LOCKED campaign count on first launch (DRAFT → LOCKED), skips check for recurring/retry runs. |
| 10 | Stripe billing period reset on renewal | Handled in `stripe-webhook` via `invoice.payment_succeeded` event — resets `org_usage` and resumes paused campaigns. |
| 11 | Campaigns usage indicator missing from sidebar | Added a third progress bar (Campaigns) to `AppSidebar`, matching the existing Call Minutes / Contacts style and colour thresholds. `MobileSidebar` intentionally left unchanged. |
| 12 | Call minutes enforcement gap — campaigns could continue sending calls after limit exhausted | FIXED: `prepare-campaign-calls` now calls `f_check_org_limit` before sending any batch to Bland AI. If minutes are exhausted, run is set to `BLOCKED` (not `PAUSED` or `COMPLETED`), non-recurring campaigns also get `campaign.status = PAUSED`, and a 403 with `{ blocked: true, reason }` is returned. |
| 13 | Bland AI NO_ANSWER classification matched "no answer" string that Bland never actually sends | FIXED: `process-call-webhook` now correctly matches `"temporarily unavailable"` (Bland AI's actual error string for unanswered calls). BUSY continues to match `"busy"` correctly. |
| 27 | Team members UI | Implemented: Team Members tab in Profile page (admin only) with pending/active/inactive status, invite sending, revoke pending invitations, remove active members, and reactivation via re-invite. Managed via `f_get_org_members_with_status` RPC and `manage-member` edge function. |
| 28 | Call minutes enforcement updated for metered billing (free plan PAYG) | FIXED: `f_check_org_limit` now allows free plan orgs with a `stripe_customer_id` on file to exceed their included 60 min/month at $1.00/min (PAYG). `process-call-webhook` reports per-call usage to Stripe when `stripe_metered_item_id` is set. Free plan orgs with no card are still blocked at the limit. Card collection handled by `create-setup-intent` edge function and `AddPaymentMethodDialog` component. |
| 29 | Free plan UI fix — `callMinutesExhausted` and `needsPaymentMethod` logic corrected | FIXED: `callMinutesExhausted` now correctly excludes free plan (`plan_id !== 'free'`) so free plan users always see the Add Payment Method dialog instead of the generic upgrade message. `needsPaymentMethod` no longer depends on `callMinutesExhausted` — it simply checks `plan_id === 'free'` and no `stripe_customer_id`. |
| 30 | Invoice history | Subscriptions page now fetches real Stripe invoices via `get-invoices` edge function. Download links open Stripe's hosted PDF. Empty state shown when no invoices exist yet. Mock billing data removed. |
| 31 | Overage cost display | Sidebar now shows estimated overage cost below the Call Minutes progress bar when a paid plan user exceeds their included minutes. Calculated as: `max(0, minutes_used − included_minutes) × overage_rate_per_minute` from the plans table. Updates in real time as usage changes. |
| 32 | Outbound webhook delivery implemented | `process-call-webhook` now checks `webhook_subscriptions` after each call and POSTs a signed payload to all registered URLs. Payload signed with HMAC-SHA256. Headers: `X-Webhook-Signature: sha256=...` and `X-Webhook-Event: call.completed`. Delivery is non-fatal. |
| 33 | API key management UI implemented | Profile → API Keys tab allows admins to generate, copy, and revoke API keys without SQL access. Generated key is shown once with a copy button. Revoked keys show as inactive immediately. |
| 34 | Prompt validation implemented | Two-layer validation (keyword blocklist + OpenAI Moderation API) runs before every campaign launch. Blocked campaigns show specific reason in Campaign Runs UI via `block_reason` column. |
| 35 | Campaign contact QUEUED→PENDING fix | Voicemail and failed calls now correctly update status from `QUEUED` to `PENDING` so retry logic can find them. |
| 36 | Per-org content policy | Per-org content policy implemented — admins can add custom blocked keywords from Profile → Content Policy tab. Org-specific rules enforced in `prepare-campaign-calls` alongside global platform rules. |

**Verification query used for #7 and #8 (re-run if auditing function grants again):**
```sql
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name IN (
  'custom_access_token_hook', 'f_create_ai_webhook',
  'f_get_ai_webhook_by_ai_call_id', 'f_get_ai_webhook_by_id',
  'f_get_ai_webhooks', 'f_get_campaign_runs_grouped',
  'f_get_due_scheduled_runs', 'f_get_webhook_stats',
  'f_mark_webhook_processed', 'f_process_webhook',
  'f_trigger_prepare_campaign_calls', 'get_user_organization_id',
  'handle_new_user', 'user_has_role'
)
AND grantee IN ('anon', 'authenticated');
-- Expect zero rows
```

### Identified — Not Blocking, Documented for Cleanup

| # | Finding | Detail |
|---|---|---|
| 12 | `trigger_create_campaign_contacts_snapshot()` is orphaned | Not attached to any trigger (confirmed via `pg_trigger` lookup). Superseded by `f_trigger_auto_snapshot_on_run_start`, which is the active, documented version. Safe to drop in a future cleanup pass. |
| 13 | `sync_contacts_on_group_add()` is orphaned | Not attached to any trigger. `contact_groups.contact_count` is instead kept in sync manually inside `f_add_contact_to_group` and `f_remove_contact_from_group`. Safe to drop in a future cleanup pass. |

### Critical — Fix Before Production

| # | Issue | Fix | Time |
|---|---|---|---|
| 14 | Legacy API keys (valid until end 2026) | Migrate to sb_publishable + sb_secret | 30min |
| 15 | No database backups | Supabase Dashboard → Settings → Backups (requires plan upgrade — Free plan has limited backup options) | 15min + decision needed |
| 16 | Postgres version has outstanding security patches | Upgrade via Supabase Dashboard → Settings → Infrastructure. Requires a scheduled maintenance window (brief downtime) — not to be done ad hoc. | TBD, needs window |

### Important — Fix Soon

| # | Issue | Fix | Time |
|---|---|---|---|
| 17 | Fake test phone numbers in DB | Deactivate + add phone constraint | 30min |
| 18 | No GitHub connected to Supabase | Connect via Project Settings → Integrations | 30min |
| 19 | Supabase compute on NANO | Upgrade to SMALL for production | 15min |
| 20 | Microsoft Azure OAuth — `login.microsoftonline.com` 404 | Caused by Azure Tenant URL in Supabase including `/v2.0` (Supabase appends this automatically, causing a duplicated path segment). Fix requested from supervisor; not yet verified. | 5min once corrected |
| 21 | Leaked password protection disabled | Requires Supabase Pro plan or above — not available on current Free plan. Revisit after plan upgrade. | Blocked by plan |
| 22 | OTP expiry exceeds recommended threshold (>1hr) | Could not locate the setting in current dashboard view — needs further investigation or may also be plan-gated. | TBD |
| 23 | `pg_net` extension installed in `public` schema | Should be moved to a dedicated schema per Supabase lint recommendation. Needs care — used by `f_trigger_prepare_campaign_calls` for `net.http_post`. | TBD, needs testing |

### Minor

| # | Issue | Status |
|---|---|---|
| 24 | Stripe price IDs (test mode) | Received: Starter `price_1ThKGqAgXUMNP9ziJFKikfoc` ($0.01 AUD), Pro `price_1ThKH3AgXUMNP9ziDgVAuFPz` ($0.02 AUD), Business `price_1ThKHGAgXUMNP9zi0cfQ4kJj` ($0.03 AUD). Pending: update `plans.stripe_price_id` and swap `STRIPE_SECRET_KEY` from live to test (requires senior/admin access — requested). |
| 25 | Auto-pause on minutes exhausted | ~~Implement with Stripe integration~~ — RESOLVED: see Resolved #12 above. |
| 26 | No email notifications | Future — integrate SendGrid/Resend |

### Future Enhancements

| # | Feature | Estimated Effort | Notes |
|---|---|---|---|
| ~~27~~ | ~~Team members UI~~ | ~~1 week~~ | ~~Resolved — see Resolved #27 above.~~ |
| 28 | API gateway for external access | 3-4 days | Confirmed real requirement: Intellistrata (first B2B client) needs API access to create campaigns/contacts and launch calls for single or bulk recipients programmatically, as part of their debt recovery workflow (alongside existing post/email/SMS channels). |
| 29 | Outbound webhook support (event notifications to client URLs) | 1-2 days, on top of #28 | Requested alongside API gateway: ability to register a target URL (Intellistrata's or any third party's) that gets called when events occur (e.g. call completed). Needs a `webhook_subscriptions` table, signed payloads (HMAC), and a retry/backoff policy for failed deliveries — can reuse the `ai_webhooks` audit-log pattern. |
| 30 | Recording retention policy | 1 day | |
| 31 | Contacts per run limit enforcement | 2 hours | `max_contacts_per_run` exists in plans table but is not yet checked in `f_create_campaign_run`. |
| 32 | Landing page, Terms & Conditions, Privacy Policy | TBD | Flagged by leadership as not urgent, but worth raising again given Intellistrata is a real B2B client in a compliance-sensitive (debt recovery) industry. |
| 33 | Analytics | Deferred indefinitely | Explicitly delayed by leadership — "release first version and see how we go." |
| 34 | Confirm PCI scope / card storage | Quick to close out | Stripe Checkout never transmits card data to our servers — this keeps the platform out of full PCI scope (SAQ-A eligible). Needs to be communicated back to leadership as a confirmed answer, not just an assumption. |

---

## 12. Role-Based Access Control

### Three Roles

```
super_admin
  Identified by: hardcoded email check (superadmin@aialabs.com)
  Access:        All pages including Super Admin cross-org view
  Enforced in:   AppSidebar (nav filtering), ProtectedRoute (route guard),
                 f_super_admin_get_all_orgs RPC (email check inside function)
  Note:          Not stored as a role value in the users table —
                 identified solely by email match at runtime

admin
  Identified by: users.role = 'admin'
  Access:        All org pages including Subscriptions and Team Members
  Can:           Invite new team members, manage subscriptions,
                 see all contacts/campaigns/call logs/runs
  Enforced in:   AppSidebar (Subscriptions nav item),
                 ProtectedRoute (roles prop on /subscriptions route),
                 send-invite edge function (role check before inviting)

member
  Identified by: users.role = 'member' (default)
  Access:        Contacts, Campaigns, Campaign Runs, Call Logs, Profile
  Cannot access: Subscriptions, Team Members (invite), Super Admin
  Enforced in:   AppSidebar (nav items filtered), ProtectedRoute
```

### Enforcement Points

| Layer | Mechanism |
|---|---|
| AppSidebar | `navItems` filtered by `item.roles` array; super_admin check by email |
| ProtectedRoute | `roles` prop passed to route; redirects to `/dashboard` if unauthorised |
| send-invite edge function | Checks `user.role === 'admin'` before proceeding |
| f_super_admin_get_all_orgs | Checks `auth.email() = 'superadmin@aialabs.com'` inside SECURITY DEFINER function |
| f_super_admin_update_org | Checks `auth.email() = 'superadmin@aialabs.com'` inside SECURITY DEFINER function |
| RLS policies | Enforce org-level isolation for all non-super-admin data access |

### Super Admin Page Capabilities (Editable)

```
Org name        → updates organizations.name
Plan override   → updates org_subscriptions.plan_id
                  Database only — does not affect Stripe billing
Active toggle   → updates organizations.is_active
                  All orgs shown in the table regardless of active status
Reset usage     → zeroes org_usage counters (calls_made, call_minutes_used,
                  contacts_count, campaigns_count)
                  Used for billing error corrections and demo resets
```

All edits go through `f_super_admin_update_org` (SECURITY DEFINER RPC) to bypass RLS.

---

## 13. Team Invitation Flow

### End-to-End Flow

```
1. Admin opens Profile → Team Members tab
2. Clicks "Invite Member" → enters email → "Send Invitation"
3. Frontend calls supabase.functions.invoke('send-invite', { body: { email } })
4. send-invite edge function:
     → Validates caller is org admin
     → Rejects if email already exists in system
     → Calls supabaseAdmin.auth.admin.inviteUserByEmail()
       with { org_id, role: 'member' } in user_metadata
5. Supabase sends invitation email with magic link to the invitee
6. Invitee clicks link → browser navigates to /auth/callback with #type=invite in hash
7. AuthCallbackPage detects type=invite →
     redirects to /reset-password + hash (preserves token)
8. User sets their password on /reset-password → session created
9. handle_new_user trigger fires on auth.users INSERT:
     → Reads org_id and role from user_metadata
     → Joins the existing org as 'member' (skips org creation)
10. Member is now logged in and sees org data immediately
```

### Known Behaviour

```
Supabase creates auth.users row immediately when invite is sent
(not when accepted). The user appears in the users table before
accepting — last_sign_in_at is null until they actually log in.
This is a Supabase platform behaviour, not a bug.
```

### Edge Cases Handled

| Scenario | Handling |
|---|---|
| Duplicate email (already in system) | send-invite rejects with clear error message before calling Supabase invite API |
| Expired or already-used invite token | Supabase returns `error_code` in hash → AuthCallbackPage detects it → redirects to `/sign-in?error=<message>` → SignIn page shows destructive "Link Expired" toast |
| Non-admin tries to invite | send-invite returns 403; frontend shows error toast |

### Revoking a Pending Invitation

Admin clicks Revoke on a pending member in Profile → Team Members. Calls `manage-member` edge function with `action='revoke'`. Deletes from `public.users` and `auth.users`. Invite link immediately becomes invalid (token no longer exists). Email is freed — admin can re-invite the same address.

### Removing an Active Member

Admin clicks Remove on an active member. Calls `manage-member` with `action='remove'`. Sets `is_active = false` in `public.users`. Calls `signOut('global')` to invalidate sessions. Member is signed out on their next page navigation (AuthContext checks `is_active` on every auth state change and ProtectedRoute checks on every route navigation). Auth account preserved — re-invite reactivates.

### Member Status Display

Team Members tab shows three states:

```
Active  (green) → last_sign_in_at is set, is_active = true
Pending (amber) → last_sign_in_at is null (invite sent, not yet accepted)
Inactive (grey) → is_active = false (removed by admin)
```

Data comes from `f_get_org_members_with_status` RPC which joins `public.users` with `auth.users`.

### Access Revocation on Removal

Two-layer enforcement:

```
1. AuthContext: fetchUserProfile checks is_active after every auth state change.
   If false → calls supabase.auth.signOut() immediately.

2. ProtectedRoute: checks user.is_active on every route navigation.
   If false → signs out.

Note: JWT access tokens remain technically valid until expiry (Supabase
limitation) but the is_active check in AuthContext catches the user on their
next page load or navigation, effectively blocking access within seconds.
```

---

## 14. Metered Billing Architecture

### Overview

The platform uses a hybrid billing model:

- **Flat subscription plans** (Starter/Pro/Business) — monthly recurring fee via Stripe Subscriptions; included call minutes per month; usage resets on renewal.
- **Free plan with Pay-As-You-Go (PAYG)** — no monthly charge; 60 included minutes/month; overage charged at $1.00/min via Stripe metered billing when a card is on file.

### How Stripe Metered Billing Works

| Plan | Monthly | Included Min | Overage Rate |
|---|---|---|---|
| **Free** | $0 | 0 | $0.004/min (PAYG, all minutes) |
| **Starter** | $29 | 100 | $0.003/min (above 100) |
| **Pro** | $79 | 300 | $0.002/min (above 300) |
| **Business** | $199 | 800 | $0.001/min (above 800) |

Paid plan metered prices use Stripe's graduated tier pricing:
- Tier 1: First N minutes (included) → $0.00
- Tier 2: Above N minutes → overage rate

Stripe automatically handles the included minutes calculation — we report ALL minutes after each call and Stripe bills only the true overage. No custom calculation needed on our side.

Free plan uses a flat metered rate with no tiers — every minute is billed from minute 1 at $0.004/min.

### Stripe Products Required

Each paid plan checkout session attaches two Stripe prices:
1. **Flat recurring price** (`stripe_price_id`) — fixed monthly subscription amount.
2. **Metered usage price** (`stripe_metered_price_id`) — per-call-minute, aggregated, invoiced monthly.

Stripe returns a `subscription_item` ID for the metered price on checkout completion. This is captured in `stripe-webhook` and stored in `org_subscriptions.stripe_metered_item_id`. `process-call-webhook` uses it to report per-call usage via the Stripe Usage Records API.

### Free Plan PAYG Flow

```
1. Free plan user exhausts 60 included minutes
2. prepare-campaign-calls calls f_check_org_limit → make_call check fails
3. If stripe_customer_id is NULL → set run BLOCKED (no card, access denied)
4. If stripe_customer_id is SET → allow call to proceed (PAYG)
5. User without a card clicks Launch → AddPaymentMethodDialog opens:
     → create-setup-intent creates Stripe SetupIntent + saves stripe_customer_id
     → Stripe Elements collects card details (no charge)
     → confirm-payment-method called on success (non-fatal)
6. Subsequent calls pass f_check_org_limit (stripe_customer_id now set)
7. process-call-webhook reports duration to Stripe UsageRecord API
8. Stripe aggregates usage daily → invoices at end of month
```

### Database Fields

| Table | Field | Purpose |
|---|---|---|
| `org_subscriptions` | `stripe_customer_id` | Stripe customer ID; set on first card save or checkout |
| `org_subscriptions` | `stripe_metered_item_id` | Subscription item ID for metered price; set on paid plan checkout |
| `plans` | `stripe_price_id` | Flat recurring price ID for checkout |
| `plans` | `stripe_metered_price_id` | Metered usage price ID for checkout (pending — not yet in schema) |

### Pending (waiting on supervisor)

```
⚠️ stripe_metered_price_id values need to be added to the plans table once
   supervisor creates the metered prices in Stripe using graduated tier pricing
   for paid plans and flat rate for free plan. One SQL UPDATE per plan once
   Price IDs are received.
```

---

## 15. API Gateway

### Overview

The API gateway provides external REST API access to the platform for B2B integrations. Intellistrata is the first confirmed client, using this to integrate AI calling into their debt recovery workflow alongside existing post, email and SMS channels.

### Authentication

All API requests must include an API key in the Authorization header:

```
Authorization: Bearer ak_live_xxxxxxxxxxxxx
```

API keys are generated per organisation, stored as SHA-256 hashes (never plain text), and can be revoked at any time.

### Base URL

```
https://eekzetzhlxhclerfdcmf.supabase.co/functions/v1/api-gateway
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /contacts | List all active contacts |
| POST | /contacts | Create a new contact |
| POST | /campaigns | Create a new campaign |
| POST | /campaigns/:id/launch | Launch a campaign |
| GET | /campaigns/:id/status | Get latest run status |
| GET | /call-logs | Get call results |
| POST | /webhooks | Register a webhook URL |
| GET | /webhooks | List active webhooks |
| DELETE | /webhooks/:id | Remove a webhook |

### Endpoint Details

**POST /contacts**
```
Required: phone_number
Optional: first_name, last_name, email
Returns:  contact object with id
```

**POST /campaigns**
```
Required: name, greeting, instructions
Optional: schedule_type (immediate/scheduled/recurring),
          scheduled_start_at, contact_ids[]
Returns:  campaign_id
```

**POST /campaigns/:id/launch**
```
No body required
Returns: campaign_id, run_id, status
```

**GET /campaigns/:id/status**
```
Returns: latest_run object with status, calls_attempted,
         calls_completed, calls_pending
```

**GET /call-logs**
```
Optional query params: campaign_id, limit
Returns: array of call logs with status, call_duration,
         collected_data, transcript_text
```

**POST /webhooks**
```
Required: target_url
Optional: event_types (default: ['call.completed'])
Returns:  webhook object + signing secret
          (secret shown only once — save immediately)
```

### How to Generate an API Key

Run in Supabase SQL Editor:

```sql
SELECT * FROM f_create_api_key(
  'your-org-id-here',
  'Key name e.g. Intellistrata Production'
);
```

Copy the `api_key` value immediately. It is shown only once and cannot be retrieved again. Store it securely.

### How to Test the API

Use any HTTP client (Postman, curl, or browser DevTools console):

```typescript
// GET contacts
fetch('/api-gateway/contacts', {
  headers: { 'Authorization': 'Bearer ak_live_xxx' }
})

// Create a contact
fetch('/api-gateway/contacts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ak_live_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    first_name: 'John',
    phone_number: '+61412345678'
  })
})
```

**Full workflow:**
```
1. POST /contacts                    → get contact_id
2. POST /campaigns with contact_ids  → get campaign_id
3. POST /campaigns/:id/launch        → launches calls
4. GET /campaigns/:id/status         → check progress
5. GET /call-logs?campaign_id=xxx    → get results
```

### How API Key Validation Works

```
1. Request arrives at api-gateway edge function
2. Authorization header extracted
3. Key hashed using SHA-256
4. Hash compared against api_keys table
5. If match found and is_active = true
   → org_id extracted → request proceeds
6. If no match → 401 Unauthorized returned
7. last_used_at updated on every valid request
```

### Webhook Events

Currently supported event: `call.completed` → fired when a call finishes.

**Payload sent to target_url:**
```json
{
  "event": "call.completed",
  "call_log_id": "uuid",
  "campaign_id": "uuid",
  "contact_id": "uuid",
  "status": "ANSWERED/FAILED/VOICEMAIL/BUSY/NO_ANSWER",
  "call_duration": "seconds",
  "collected_data": {},
  "transcript_text": "string | null"
}
```

Payloads are signed using HMAC-SHA256. Verify the signature using the secret returned when registering the webhook.

### Database Tables Added

#### `api_keys`
```
id, org_id, name, key_hash (SHA-256), key_prefix,
is_active, last_used_at, created_at, updated_at
```

#### `webhook_subscriptions`
```
id, org_id, target_url, secret, event_types[],
is_active, created_at, updated_at
```

### RPCs Added

```
f_create_api_key(org_id, name)
  → Generates key, stores SHA-256 hash, returns plain key
    once only. Uses pgcrypto extension (extensions schema).

f_get_api_keys(org_id)
  → Lists all keys for an org without revealing the key
    values. Shows key_prefix, is_active, last_used_at.

f_revoke_api_key(key_id, org_id)
  → Sets is_active = false. Key immediately stops working.

f_validate_api_key(api_key)
  → Hashes the input key, looks up matching hash in
    api_keys table, updates last_used_at, returns
    org_id and key_id.
```

### Edge Function

`api-gateway` deployed with `--no-verify-jwt` because Intellistrata sends an API key, not a Supabase JWT. JWT verification disabled at the Supabase function level. The function validates the API key itself.

### Security

```
→ Keys stored as SHA-256 hashes only — plain text never
  stored after generation
→ Plain key shown once at generation time
→ All requests validated before any action
→ Org isolation enforced — API key only accesses data
  belonging to its org
→ Cannot access other orgs' data
→ Keys can be revoked instantly via f_revoke_api_key or
  by setting is_active = false in api_keys table
```

### Outbound Webhook Payload

When a call completes, the platform POSTs this payload to all registered webhook URLs:

```json
{
  "event": "call.completed",
  "call_log_id": "uuid",
  "campaign_id": "uuid",
  "contact_id": "uuid",
  "status": "ANSWERED|FAILED|VOICEMAIL|BUSY|NO_ANSWER",
  "call_duration": 120,
  "collected_data": {
    "disposition": "...",
    "call_outcome": "...",
    "answered_by": "human|voicemail|unknown"
  },
  "transcript_text": "Hello...",
  "timestamp": "2026-07-31T00:00:00.000Z"
}
```

**Headers sent with every delivery:**
```
Content-Type: application/json
X-Webhook-Signature: sha256=<hmac_hex>
X-Webhook-Event: call.completed
```

**Verifying the signature (example):**
```javascript
const hmac = crypto.createHmac('sha256', webhookSecret)
hmac.update(rawBody)
const expected = 'sha256=' + hmac.digest('hex')
const isValid = expected === req.headers['x-webhook-signature']
```

Delivery is non-fatal — if delivery fails, call processing continues normally. No retry logic currently implemented.

---

### Known Limitations (not yet built)

```
→ Outbound webhook delivery: COMPLETED.
  When a call completes, process-call-webhook checks
  webhook_subscriptions for the org, and POSTs the call
  result to each registered URL. Payload is signed with
  HMAC-SHA256.
  Header: X-Webhook-Signature: sha256=...
  Header: X-Webhook-Event: call.completed

→ API key management UI: COMPLETED.
  Admins can generate, view and revoke API keys from
  Profile → API Keys tab. Generated key is shown once
  with a copy button and cannot be retrieved again.
  Revoked keys show as inactive immediately.

→ Rate limiting: no per-key rate limiting implemented yet.
  Recommended before production B2B use.

→ Idempotency keys: no duplicate prevention on
  campaign/contact creation. If Intellistrata retries a
  failed request, a duplicate may be created.
```

---

## 16. Changelog & What's New

### Overview
An in-app changelog system that notifies
users of new features and updates via a
slide-out panel connected to the Bell icon
in the header.

### How it works
→ Super admin publishes changelog entries
  from the Super Admin page
→ Bell icon in header shows a red dot
  when there are unread entries
→ User clicks bell → slide-out panel opens
  showing all published entries
→ Red dot disappears after viewing
→ "Last seen" tracked in localStorage
  per browser session

### Database Table
changelog:
- id (uuid)
- title (text) — feature name
- description (text) — what changed
- release_date (date) — shown grouped by month
- is_published (boolean) — draft or live
- created_at, updated_at (timestamptz)

RLS:
→ authenticated users can read published entries
→ authenticated users can insert entries
  (restricted to super admin via UI only)

### Components Added
ChangelogPanel (src/components/layout/ChangelogPanel.tsx):
→ Slide-out panel from right side of screen
→ Fetches published entries from changelog table
→ Groups entries by month
→ Shows "New" badge on most recent entry
→ Marks as read via localStorage on open

useChangelogUnread hook:
→ Checks if latest changelog entry is newer
  than localStorage last_seen timestamp
→ Returns hasUnread boolean for bell dot

### Super Admin Management
Super Admin page → What's New section:
→ View all changelog entries with status
→ Add Entry form:
  - Title
  - Description
  - Release date (defaults to today)
  - Publishes immediately (is_published = true)

### User Experience
→ New user → red dot always shows
  (no localStorage entry yet)
→ After viewing → red dot disappears
→ New entry published → red dot reappears
  for all users on next page load
→ Panel closes when clicking outside

---

## 17. Prompt Validation

### Overview
Campaign prompts (greeting and instructions)
are validated before any calls are sent to
Bland AI. This prevents harmful, inappropriate
or deceptive content from being used in
automated calls.

### How it works
Validation runs in prepare-campaign-calls
edge function after the call minutes limit
check and before sending to Bland AI.
Two layers of validation run in sequence:

Layer 1 — Keyword blocklist (instant, free):
Checks the greeting and instructions for
high-risk keywords. If found → immediately
blocked, no API call needed.

Blocked keyword categories:
→ Impersonation: police, court order,
  sheriff, arrest, warrant, government
  official, ato, irs, federal agent,
  law enforcement
→ Financial data collection: bank account
  number, credit card number, bsb number,
  pin number, cvv, routing number,
  account password
→ Illegal threats: seize your assets,
  garnish your wages, criminal charges,
  send you to jail, repossess, have you
  arrested
→ Deceptive identity: pretend to be,
  act as if you are, claim to be from,
  say you are from, impersonate

Layer 2 — OpenAI Moderation API (free):
If keyword check passes, the prompt is sent
to OpenAI's moderation endpoint
(POST https://api.openai.com/v1/moderations).
OpenAI checks for: harassment, threatening,
hate, self-harm, sexual, violence content.
If flagged → blocked with category details.

### When validation is skipped
If OPENAI_API_KEY is not set in Supabase
Edge Function Secrets, the OpenAI check
is skipped. Keyword check still runs.
If OpenAI API is down → non-fatal, campaign
proceeds (availability > strict enforcement).

### What happens when blocked
→ Campaign run status set to BLOCKED
→ block_reason saved to campaign_runs table
  with the specific reason
→ UI shows the actual reason instead of
  generic "Call minutes limit reached"
→ Admin can edit the campaign instructions
  and relaunch

### Future upgrade path
Can switch from OpenAI to Claude moderation
with minimal code change:
→ Change API URL
→ Change request headers
→ Change request body format
→ Change response parsing
→ All other logic stays identical

### Database change
block_reason text column added to
campaign_runs table.
All 5 campaign run RPCs updated to include
block_reason in their return columns:
→ f_get_org_campaign_runs
→ f_get_campaign_run_by_id
→ f_get_active_campaign_run
→ f_get_campaign_runs
→ f_get_campaign_runs_grouped

### Environment variable required
OPENAI_API_KEY → add to Supabase Edge
Function Secrets (sk-...)
Free to use — OpenAI moderation endpoint
has no cost and no quota limits.

---

## 18. Per-Organisation Content Policy

### Overview
Organisation admins can define custom
keyword/phrase blocklists on top of the
global platform rules. When a campaign is
launched, both global and org-specific rules
are checked before sending to Bland AI.

### How it works
1. Admin goes to Profile → Content Policy tab
2. Adds keywords or phrases to block
3. When any campaign is launched:
   → Global keyword check runs first
   → Org-specific keyword check runs second
   → OpenAI moderation runs third
   → If any check fails → campaign BLOCKED
     with specific reason shown in UI

### Database Table
org_content_policies:
- id (uuid)
- org_id (uuid) → references organizations
- policy_type (text) → default 'blocked_keyword'
- value (text) → keyword/phrase in lowercase
- description (text) → optional reason/note
- is_active (boolean) → soft delete
- created_by (uuid) → references users
- created_at, updated_at (timestamptz)

RLS: org isolation enforced — each org
can only see and manage their own policies.

### RPCs Added
f_create_content_policy(org_id, value,
  description, policy_type)
→ Validates value not empty
→ Checks for duplicates
→ Stores in lowercase for case-insensitive
  matching
→ Returns created policy row

f_get_content_policies(org_id)
→ Returns all active policies for the org
→ Ordered by created_at DESC

f_delete_content_policy(id, org_id)
→ Soft deletes (sets is_active = false)
→ Org isolation enforced via org_id check

### Edge Function Change
prepare-campaign-calls updated:
→ After global keyword check passes,
  fetches org_content_policies for the
  campaign's org
→ Runs org-specific keyword check on
  greeting + instructions
→ If matched → returns BLOCKED with message:
  "Campaign contains content restricted by
  your organisation's content policy: {keyword}.
  Please review your campaign instructions or
  update your content policy in Profile settings."

### UI
Profile → Content Policy tab (admin only):
→ Add keyword/phrase input with optional
  description field
→ Table of existing rules with keyword,
  reason, date added, Remove button
→ Global rules notice explaining platform
  rules cannot be removed
→ Keywords stored and matched in lowercase
  (case-insensitive matching)

### Important Notes
→ Org keywords are checked AFTER global
  keywords but BEFORE OpenAI moderation
→ Removing a keyword immediately allows
  previously blocked content
→ Keywords are stored in lowercase —
  matching is case-insensitive
→ Duplicate keywords are rejected

---

*AI Call Scheduler Technical Documentation v1.0 — July 2026*
*Last updated: July 2026 — added security remediation log (Vault migration, search_path fixes, anon/authenticated SECURITY DEFINER review), orphaned function findings, Intellistrata API/webhook requirements, Stripe test mode credentials status, send-invite edge function, f_super_admin_get_all_orgs RPC, BLOCKED campaign run status, corrected NO_ANSWER Bland AI classification, RBAC documentation (Section 12), Team Invitation Flow (Section 13), team member management (pending status, revoke, remove, reactivation), super admin editable fields (name, plan, active status, usage reset), metered billing architecture (Section 14), create-setup-intent edge function, free plan PAYG flow, f_check_org_limit metered billing logic.*
