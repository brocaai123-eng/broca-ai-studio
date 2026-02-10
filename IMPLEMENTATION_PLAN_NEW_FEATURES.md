# Broca AI Studio - New Features Implementation Plan

## Overview

This document outlines the implementation plan for three major feature sets:
1. **Broca Affiliate Dashboard (V1)** - Separate portal for affiliate marketers
2. **Case-Centric Collaboration Model** - Broker collaboration around clients/cases
3. **Calendar Integration** - Calendar access for scheduling

---

## 1. Broca Affiliate Dashboard (V1)

### Purpose
A **separate portal** for affiliate marketers whose sole purpose is to promote Broca for recurring commission (25% of subscription revenue).

### Database Schema

```sql
-- File: supabase/migrations/create_affiliate_system.sql

-- 1. Affiliates Table (separate from brokers)
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  referral_code TEXT UNIQUE NOT NULL, -- e.g., "JEFF2026"
  referral_link TEXT GENERATED ALWAYS AS (
    'https://broca.ai/signup?aff=' || referral_code
  ) STORED,
  commission_rate DECIMAL(5,2) DEFAULT 25.00, -- 25% default
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
  payout_method TEXT CHECK (payout_method IN ('stripe', 'ach', 'paypal')),
  payout_email TEXT, -- For PayPal/ACH
  stripe_connect_id TEXT, -- For Stripe Connect payouts
  minimum_payout DECIMAL(10,2) DEFAULT 50.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Affiliate Referrals Table (tracks signup → conversion)
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referred_email TEXT NOT NULL,
  status TEXT DEFAULT 'clicked' CHECK (status IN ('clicked', 'signed_up', 'trial', 'active', 'churned', 'refunded')),
  plan_name TEXT, -- Starter / Pro / Enterprise
  mrr DECIMAL(10,2) DEFAULT 0, -- Monthly Recurring Revenue from this referral
  commission_rate DECIMAL(5,2), -- Snapshot of rate at time of signup
  ip_address TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  signed_up_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ, -- When they became a paying customer
  churned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Affiliate Commissions Table (monthly commission records)
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  referral_id UUID REFERENCES public.affiliate_referrals(id) ON DELETE SET NULL,
  period_start DATE NOT NULL, -- First day of commission month
  period_end DATE NOT NULL, -- Last day of commission month
  mrr_amount DECIMAL(10,2) NOT NULL, -- Revenue from customer
  commission_amount DECIMAL(10,2) NOT NULL, -- affiliate's cut
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Affiliate Payouts Table
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payout_method TEXT NOT NULL,
  payout_reference TEXT, -- Stripe transfer ID, ACH ref, etc.
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Affiliate Resources Table
CREATE TABLE IF NOT EXISTS public.affiliate_resources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('video', 'pdf', 'document', 'link')),
  url TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_affiliate_referrals_affiliate ON public.affiliate_referrals(affiliate_id);
CREATE INDEX idx_affiliate_referrals_status ON public.affiliate_referrals(status);
CREATE INDEX idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_affiliate_commissions_period ON public.affiliate_commissions(period_start, period_end);
CREATE INDEX idx_affiliate_payouts_affiliate ON public.affiliate_payouts(affiliate_id);

-- RLS Policies
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_resources ENABLE ROW LEVEL SECURITY;

-- Affiliates can only see their own data
CREATE POLICY "Affiliates can view own profile" ON public.affiliates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Affiliates can update own profile" ON public.affiliates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Affiliates can view own referrals" ON public.affiliate_referrals
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "Affiliates can view own commissions" ON public.affiliate_commissions
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "Affiliates can view own payouts" ON public.affiliate_payouts
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

-- Everyone can view resources
CREATE POLICY "Anyone can view resources" ON public.affiliate_resources
  FOR SELECT USING (true);

-- Admins have full access
CREATE POLICY "Admins can manage affiliates" ON public.affiliates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### File Structure

```
app/
├── affiliate/                          # Affiliate Portal (separate from broker dashboard)
│   ├── layout.tsx                      # Affiliate-specific layout
│   ├── page.tsx                        # Dashboard overview
│   ├── referrals/
│   │   └── page.tsx                    # Referral activity table
│   ├── commissions/
│   │   └── page.tsx                    # Commission & payouts
│   ├── resources/
│   │   └── page.tsx                    # Marketing resources
│   └── settings/
│       └── page.tsx                    # Profile & payout settings
├── api/
│   └── affiliate/
│       ├── route.ts                    # GET affiliate profile, stats
│       ├── referrals/
│       │   └── route.ts                # GET referrals list
│       ├── commissions/
│       │   └── route.ts                # GET commissions
│       ├── payouts/
│       │   └── route.ts                # GET/POST payouts
│       └── track/
│           └── route.ts                # Track clicks (public)
├── signup/
│   └── page.tsx                        # UPDATE: Track affiliate referral codes
components/
├── layout/
│   └── AffiliateLayout.tsx             # Affiliate portal layout
lib/
├── hooks/
│   └── use-affiliate.ts                # React Query hooks for affiliate data
├── types/
│   └── affiliate.ts                    # TypeScript types
```

### Dashboard Components

#### 1. Key Metrics Cards (Top Section)
```tsx
// 4 cards answering "Am I making money?"
- Active Referrals: Count of status='active' referrals
- Monthly Recurring Commission: SUM(commission_amount) WHERE period = current month
- Lifetime Earned: SUM(all paid + pending commissions)
- Conversion Rate: (signed_up / total_clicks) * 100
```

#### 2. Referral Link Section
```tsx
// Action area for sharing
- Primary referral link with copy button
- QR code generator (use qrcode.react library)
- Optional short link toggle
- Text: "You earn 25% recurring commission on every active referral."
```

#### 3. Referral Activity Table
```tsx
// Columns:
| Customer (masked email) | Plan | Status | MRR | Commission | Start Date |
| j***@example.com        | Pro  | Active | $99 | $24.75     | Jan 15     |
```

#### 4. Commission & Payouts Section
```tsx
- Current balance (approved, unpaid)
- Pending balance (awaiting approval)
- Paid balance (lifetime total)
- Next payout date (1st of month)
- Minimum payout threshold: $50
- Payout method selector (Stripe Connect / ACH)
```

#### 5. Resources Tab
```tsx
- 1 demo video (Loom/YouTube embed)
- 1 one-pager PDF download
- Suggested talking points
- FTC affiliate disclosure reminder
```

### Implementation Steps

1. **Phase 1: Database & Auth (Day 1-2)**
   - Create migration SQL file
   - Run migration in Supabase
   - Update profiles table to add `is_affiliate` flag OR keep separate
   - Create affiliate signup flow

2. **Phase 2: API Routes (Day 2-3)**
   - `GET /api/affiliate` - Profile & stats
   - `GET /api/affiliate/referrals` - List referrals
   - `GET /api/affiliate/commissions` - Commission history
   - `POST /api/affiliate/payouts` - Request payout
   - `GET /api/affiliate/track?code=XXX` - Track click (cookie 30 days)

3. **Phase 3: Frontend Pages (Day 3-5)**
   - Create `AffiliateLayout.tsx` with sidebar
   - Build dashboard overview page with 4 metric cards
   - Build referral link section with QR code
   - Build referral activity table with search/filter
   - Build commissions page with payout request
   - Build resources page

4. **Phase 4: Integration (Day 5-6)**
   - Hook into Stripe webhooks to track conversions
   - Update signup flow to capture affiliate referral code
   - Create cron job for monthly commission calculation
   - Integrate Stripe Connect for payouts

---

## 2. Case-Centric Collaboration Model

### Purpose
Brokers collaborate **around clients/cases**, not in random chat channels. Everything happens inside the client entity.

### Database Schema

```sql
-- File: supabase/migrations/create_collaboration_system.sql

-- 1. Case Collaborators Table
CREATE TABLE IF NOT EXISTS public.case_collaborators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'co_owner', 'supporting', 'reviewer', 'observer')),
  permissions JSONB DEFAULT '{
    "can_edit": true,
    "can_message": true,
    "can_upload": true,
    "can_approve": false,
    "can_delete": false
  }'::jsonb,
  added_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, broker_id)
);

-- 2. Case Milestones Table
CREATE TABLE IF NOT EXISTS public.case_milestones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Milestone owner
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  sla_hours INTEGER, -- SLA window in hours
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Case Milestone Contributors (multiple brokers per milestone)
CREATE TABLE IF NOT EXISTS public.case_milestone_contributors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  milestone_id UUID REFERENCES public.case_milestones(id) ON DELETE CASCADE NOT NULL,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'contributor' CHECK (role IN ('contributor', 'reviewer', 'approver')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(milestone_id, broker_id)
);

-- 4. Case Comments / Timeline (unified activity stream)
CREATE TABLE IF NOT EXISTS public.case_timeline (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'comment', 'mention', 'milestone_created', 'milestone_completed',
    'document_uploaded', 'document_verified', 'status_change',
    'collaborator_added', 'collaborator_removed', 'system'
  )),
  content TEXT, -- Comment text or system message
  mentions JSONB DEFAULT '[]'::jsonb, -- Array of {user_id, display_name}
  milestone_id UUID REFERENCES public.case_milestones(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_internal BOOLEAN DEFAULT TRUE, -- If false, visible to client
  is_read JSONB DEFAULT '{}'::jsonb, -- {user_id: timestamp} for read receipts
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Case Decisions Table (for tracking decisions)
CREATE TABLE IF NOT EXISTS public.case_decisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  milestone_id UUID REFERENCES public.case_milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  decision_type TEXT CHECK (decision_type IN ('approval', 'rejection', 'escalation', 'modification')),
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ DEFAULT NOW(),
  rationale TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Client Portal Access (optional client visibility)
CREATE TABLE IF NOT EXISTS public.client_portal_access (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT FALSE,
  access_token TEXT UNIQUE,
  can_view_milestones BOOLEAN DEFAULT TRUE,
  can_view_documents BOOLEAN DEFAULT TRUE,
  can_view_timeline BOOLEAN DEFAULT FALSE, -- Internal comments hidden by default
  can_upload_documents BOOLEAN DEFAULT TRUE,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Notification Preferences (per collaborator per case)
CREATE TABLE IF NOT EXISTS public.case_notification_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  notify_comments BOOLEAN DEFAULT TRUE,
  notify_mentions BOOLEAN DEFAULT TRUE,
  notify_milestones BOOLEAN DEFAULT TRUE,
  notify_documents BOOLEAN DEFAULT TRUE,
  notify_status_changes BOOLEAN DEFAULT TRUE,
  email_digest TEXT DEFAULT 'instant' CHECK (email_digest IN ('instant', 'daily', 'weekly', 'none')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, broker_id)
);

-- Indexes
CREATE INDEX idx_case_collaborators_client ON public.case_collaborators(client_id);
CREATE INDEX idx_case_collaborators_broker ON public.case_collaborators(broker_id);
CREATE INDEX idx_case_milestones_client ON public.case_milestones(client_id);
CREATE INDEX idx_case_milestones_owner ON public.case_milestones(owner_id);
CREATE INDEX idx_case_timeline_client ON public.case_timeline(client_id);
CREATE INDEX idx_case_timeline_created ON public.case_timeline(created_at DESC);

-- RLS Policies
ALTER TABLE public.case_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_milestone_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;

-- Collaborators can access cases they're part of
CREATE POLICY "Collaborators can view case data" ON public.case_collaborators
  FOR SELECT USING (
    broker_id = auth.uid() OR 
    client_id IN (SELECT client_id FROM public.case_collaborators WHERE broker_id = auth.uid())
  );

CREATE POLICY "Case owner can manage collaborators" ON public.case_collaborators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.case_collaborators cc 
      WHERE cc.client_id = case_collaborators.client_id 
      AND cc.broker_id = auth.uid() 
      AND cc.role IN ('owner', 'co_owner')
    )
  );

-- Similar policies for other tables...
```

### Role Permissions Matrix

| Permission | Owner | Co-Owner | Supporting | Reviewer | Observer |
|------------|-------|----------|------------|----------|----------|
| View Case | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Client Info | ✅ | ✅ | ✅ | ❌ | ❌ |
| Add Comments | ✅ | ✅ | ✅ | ✅ | ❌ |
| Upload Documents | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Milestones | ✅ | ✅ | ❌ | ❌ | ❌ |
| Complete Milestones | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve Decisions | ✅ | ✅ | ❌ | ✅ | ❌ |
| Add Collaborators | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove Collaborators | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete Case | ✅ | ❌ | ❌ | ❌ | ❌ |

### File Structure

```
app/
├── dashboard/
│   └── clients/
│       └── [id]/
│           ├── page.tsx                # UPDATE: Add collaboration features
│           ├── timeline/
│           │   └── page.tsx            # Case timeline view
│           ├── milestones/
│           │   └── page.tsx            # Milestones view
│           └── collaborators/
│               └── page.tsx            # Manage collaborators
├── api/
│   └── clients/
│       └── [id]/
│           ├── collaborators/
│           │   └── route.ts            # CRUD collaborators
│           ├── milestones/
│           │   └── route.ts            # CRUD milestones
│           ├── timeline/
│           │   └── route.ts            # GET/POST timeline entries
│           └── decisions/
│               └── route.ts            # GET/POST decisions
components/
├── collaboration/
│   ├── CollaboratorsList.tsx           # List/manage collaborators
│   ├── MilestoneCard.tsx               # Individual milestone
│   ├── MilestoneTimeline.tsx           # Vertical milestone timeline
│   ├── CaseTimeline.tsx                # Activity feed
│   ├── CommentBox.tsx                  # Add comment with @mentions
│   ├── MentionInput.tsx                # @mention autocomplete
│   └── RoleBadge.tsx                   # Role indicator
lib/
├── hooks/
│   └── use-collaboration.ts            # React Query hooks
```

### UI Components

#### 1. Shared Case Workspace (Client Detail Page)
```tsx
// Tabs: Overview | Timeline | Milestones | Documents | Collaborators
// Each tab shows case-specific data with role-based permissions
```

#### 2. Collaborators Panel
```tsx
// Shows: Avatar, Name, Role, Added Date, Status
// Actions: Change Role, Remove (based on permissions)
```

#### 3. Milestone Timeline
```tsx
// Vertical timeline showing:
// - Milestone title & description
// - Owner avatar
// - Contributors
// - Status badge
// - Due date / SLA indicator
// - Complete button
```

#### 4. Activity Feed (Case Timeline)
```tsx
// Shows all activity:
// - Comments with @mentions (highlighted)
// - Document uploads
// - Status changes
// - Milestone completions
// - Decisions made
// Filter: All | Comments | Documents | Milestones
```

#### 5. @Mention System
```tsx
// In comment box:
// - Type @ to trigger autocomplete
// - Shows collaborators on this case
// - Creates notification for mentioned user
// - Highlights mention in timeline
```

#### 6. Team Feed (Dashboard Widget)
```tsx
// Cross-case activity:
// - My cases with updates
// - Milestones due soon
// - @mentions for me
// - Blocked milestones
```

### AI Collaboration Features

```tsx
// AI helps teams by:
// 1. Summarizing long case histories
// 2. Highlighting unresolved decisions
// 3. Suggesting next action owner
// 4. Detecting handoff failures (milestone stalled > SLA)
// 5. Auto-tagging timeline entries
```

### Implementation Steps

1. **Phase 1: Database (Day 1-2)**
   - Create migration for all collaboration tables
   - Update clients table to support multi-broker access
   - Create RLS policies for role-based access

2. **Phase 2: APIs (Day 2-4)**
   - Collaborators CRUD
   - Milestones CRUD with owner/contributor
   - Timeline entries (comments, system events)
   - @mention parsing and notification

3. **Phase 3: UI Components (Day 4-7)**
   - Update client detail page with tabs
   - Build collaborators management panel
   - Build milestone timeline component
   - Build activity feed with filters
   - Build @mention input with autocomplete

4. **Phase 4: Notifications (Day 7-8)**
   - Real-time updates (Supabase Realtime)
   - Email notifications for @mentions
   - Digest emails (daily/weekly)

5. **Phase 5: Client Portal (Day 8-9)**
   - Optional client-facing view
   - Token-based access
   - Limited visibility based on settings

---

## 3. Calendar Integration

### Purpose
Allow brokers to schedule meetings, set reminders, and sync with external calendars.

### Database Schema

```sql
-- File: supabase/migrations/create_calendar_system.sql

-- 1. Calendar Events Table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES public.case_milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'call', 'deadline', 'reminder', 'follow_up')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  is_all_day BOOLEAN DEFAULT FALSE,
  location TEXT, -- Physical address or video link
  video_link TEXT, -- Zoom/Google Meet link
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  recurrence_rule TEXT, -- iCal RRULE format
  reminder_minutes INTEGER[] DEFAULT '{30}', -- Array of reminder times
  external_id TEXT, -- Google Calendar / Outlook ID
  external_provider TEXT CHECK (external_provider IN ('google', 'outlook', 'apple')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Event Attendees Table
CREATE TABLE IF NOT EXISTS public.calendar_event_attendees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE NOT NULL,
  attendee_type TEXT NOT NULL CHECK (attendee_type IN ('broker', 'client', 'external')),
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT, -- For external attendees
  name TEXT,
  response_status TEXT DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, broker_id),
  UNIQUE(event_id, email)
);

-- 3. Calendar Sync Settings
CREATE TABLE IF NOT EXISTS public.calendar_sync_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  provider TEXT CHECK (provider IN ('google', 'outlook', 'apple')),
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  calendar_id TEXT, -- Selected calendar to sync
  sync_enabled BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calendar_events_broker ON public.calendar_events(broker_id);
CREATE INDEX idx_calendar_events_client ON public.calendar_events(client_id);
CREATE INDEX idx_calendar_events_start ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_event_attendees_event ON public.calendar_event_attendees(event_id);

-- RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage own events" ON public.calendar_events
  FOR ALL USING (broker_id = auth.uid());

CREATE POLICY "Brokers can view events they attend" ON public.calendar_events
  FOR SELECT USING (
    id IN (SELECT event_id FROM public.calendar_event_attendees WHERE broker_id = auth.uid())
  );
```

### File Structure

```
app/
├── dashboard/
│   └── calendar/
│       └── page.tsx                    # Calendar view (month/week/day)
├── api/
│   └── calendar/
│       ├── route.ts                    # GET/POST events
│       ├── [id]/
│       │   └── route.ts                # PUT/DELETE event
│       └── sync/
│           ├── google/
│           │   └── route.ts            # Google Calendar OAuth
│           └── outlook/
│               └── route.ts            # Outlook OAuth
components/
├── calendar/
│   ├── CalendarView.tsx                # Main calendar component
│   ├── EventModal.tsx                  # Create/edit event
│   ├── MiniCalendar.tsx                # Small month picker
│   └── EventCard.tsx                   # Event display
lib/
├── hooks/
│   └── use-calendar.ts                 # React Query hooks
```

### UI Components

1. **Calendar View** - Full-page calendar with month/week/day views
2. **Quick Event Modal** - Create event from client page or calendar
3. **Sidebar Widget** - Upcoming events on dashboard
4. **Sync Settings** - Connect Google/Outlook calendar

### Implementation Steps

1. **Phase 1: Database (Day 1)**
   - Create calendar tables migration
   - Set up RLS policies

2. **Phase 2: Basic Calendar (Day 2-3)**
   - Install `react-big-calendar` or `@fullcalendar/react`
   - Create calendar page
   - Create/edit event modal
   - Link events to clients/milestones

3. **Phase 3: Calendar Sync (Day 4-5)**
   - Google Calendar OAuth integration
   - Outlook Calendar OAuth integration
   - Two-way sync logic
   - Webhook for external updates

4. **Phase 4: Reminders (Day 5-6)**
   - Email reminders before events
   - Browser notifications
   - SMS reminders (optional, Twilio)

---

## Priority & Timeline

### Recommended Implementation Order

| Priority | Feature | Complexity | Time Estimate |
|----------|---------|------------|---------------|
| 1 | **Affiliate Dashboard** | Medium | 5-6 days |
| 2 | **Case Collaboration** | High | 8-10 days |
| 3 | **Calendar Integration** | Medium | 5-6 days |

### Total Estimated Time: 18-22 days

---

## Technical Considerations

### 1. Authentication
- Affiliates need separate login flow or role-based routing
- Consider `role` column in profiles: `'admin' | 'broker' | 'affiliate'`

### 2. Real-time Updates
- Use Supabase Realtime for:
  - Case timeline updates
  - Milestone changes
  - @mention notifications

### 3. Email Notifications
- Use existing Resend integration for:
  - Affiliate commission notifications
  - @mention alerts
  - Milestone assignments
  - Calendar reminders

### 4. External Integrations
- **Stripe Connect**: For affiliate payouts
- **Google Calendar API**: For calendar sync
- **Microsoft Graph API**: For Outlook sync

### 5. Security
- Encrypt OAuth tokens before storing
- Implement proper RLS for multi-broker case access
- Rate limit affiliate tracking endpoint

---

## Questions for Clarification

1. **Affiliate Portal**: Should affiliates use the same login as brokers, or completely separate auth?

2. **Collaboration**: Should the owner be able to transfer ownership to another broker?

3. **Calendar**: Which external calendars are priority? (Google, Outlook, both?)

4. **Client Portal**: How much visibility should clients have into the case? Just milestones, or also documents?

5. **Notifications**: Real-time (in-app) notifications, email, or both?

---

## Next Steps

1. Review this plan and prioritize features
2. Finalize database schema after discussion
3. Create GitHub issues for each phase
4. Begin implementation with Affiliate Dashboard

Let me know if you'd like me to start implementing any of these features!
