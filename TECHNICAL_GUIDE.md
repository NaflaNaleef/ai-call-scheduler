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
Total:      5 active edge functions
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

---

### Function 4 — `create-checkout-session`

**Purpose:** Creates Stripe checkout session for plan upgrades.

**Triggered by:** Frontend (upgrade button click)

**Flow:**
```
→ Fetch plan stripe_price_id
→ Create/reuse Stripe customer
→ Create checkout session (AUD, subscription mode)
→ Return checkout URL to frontend
```

**CORS Headers required:**
```
authorization, x-client-info, apikey, content-type
```

### Function 5 — `stripe-webhook`

**Purpose:** Handles Stripe payment events.

**Triggered by:** Stripe (after payment events)

**Events handled:**
```
checkout.session.completed  → update plan + save customer IDs
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
| f_get_org_subscription_and_usage | p_org_id | Complete plan + usage data. Live counts for contacts and campaigns. |
| f_check_org_limit | p_org_id, p_action | Checks if action allowed. Actions: add_contact, add_campaign, make_call. |
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

#### Batch Calls API

**Endpoint:** `POST https://api.bland.ai/v2/batches/create`

**Batch payload:**
```json
{
  "global": {
    "task": "instructions + fields",
    "language": "en",
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
Required: E.164 format
Australian: +61XXXXXXXXX
Regex: /^\+61[2-9][0-9]{8}$/
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
| 27 | Team members UI | 1 week | Plans table already has `max_team_members`; not yet enforced anywhere — needs a seat-limit check similar to `f_check_org_limit`. |
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
| RLS policies | Enforce org-level isolation for all non-super-admin data access |

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

---

*AI Call Scheduler Technical Documentation v1.0 — June 2026*
*Last updated: July 2026 — added security remediation log (Vault migration, search_path fixes, anon/authenticated SECURITY DEFINER review), orphaned function findings, Intellistrata API/webhook requirements, Stripe test mode credentials status, send-invite edge function, f_super_admin_get_all_orgs RPC, BLOCKED campaign run status, corrected NO_ANSWER Bland AI classification, RBAC documentation (Section 12), and Team Invitation Flow (Section 13).*
