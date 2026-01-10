# Database Setup Guide for BROCA AI Studio

This guide will help you set up the database and complete the backend integration.

## Step 1: Run the SQL Schema in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"+ New Query"**
4. Open the file `supabase/schema.sql` from this project
5. Copy ALL contents of `schema.sql` and paste it into the Supabase SQL Editor
6. Click **"Run"** to execute the SQL

This will create:
- ✅ 10 database tables (profiles, subscription_plans, broker_subscriptions, clients, documents, form_templates, token_transactions, platform_transactions, broker_invitations, activity_log)
- ✅ Row Level Security (RLS) policies for data isolation
- ✅ Triggers for automatic profile creation
- ✅ Helper functions (get_broker_stats, get_platform_stats, deduct_tokens, add_tokens)
- ✅ 3 default subscription plans (Starter, Professional, Enterprise)

## Step 2: Verify Database Setup

1. In Supabase, go to **Table Editor**
2. You should see all 10 tables listed
3. Click on `subscription_plans` table - it should have 3 rows (Starter, Professional, Enterprise)
4. Click on `profiles` table - it will be empty initially

## Step 3: Create Your First Admin User

1. Sign up in your application (or use existing account)
2. Go to Supabase → **Table Editor** → `profiles`
3. Find your user row and click **Edit**
4. Change the `role` field from `'broker'` to `'admin'`
5. Click **Save**

## Step 4: Test the Application

### Broker Portal Testing:
1. Log in as a regular user (role: 'broker')
2. Navigate to Dashboard - you should see stats from database
3. Go to Clients page - add a new client
4. Go to Documents page - upload a document
5. Go to Tokens page - view your token balance

### Admin Portal Testing:
1. Log in as admin user
2. Navigate to `/admin` dashboard
3. You should see:
   - Total brokers count
   - Revenue statistics
   - Token usage across platform
   - List of all brokers

## What's Already Implemented

### ✅ Database Schema
- Complete PostgreSQL schema with all necessary tables
- Row Level Security ensuring brokers only see their own data
- Admin role has access to all platform data
- Automatic profile creation on signup

### ✅ React Query Hooks (Broker)
Located in `lib/hooks/use-database.ts`:
- `useProfile()` - Get/update broker profile
- `useSubscription()` - Current subscription plan and tokens
- `useBrokerStats()` - Aggregate statistics
- `useClients()` - CRUD for clients
- `useDocuments()` - CRUD for documents
- `useFormTemplates()` - CRUD for form templates
- `useTokenTransactions()` - View token usage history
- `useDeductTokens()` - Consume tokens for actions

### ✅ React Query Hooks (Admin)
Located in `lib/hooks/use-admin.ts`:
- `useIsAdmin()` - Check if user is admin
- `usePlatformStats()` - Platform-wide statistics
- `useAllBrokers()` - Manage all brokers
- `useUpdateBrokerSubscription()` - Change broker plans
- `useBrokerInvitations()` - Invite system
- `useAddTokens()` - Allocate tokens to brokers
- `useActivityLog()` - View all platform activity

### ✅ Pages Updated with Dynamic Data
- `/dashboard` - Broker dashboard with real stats
- `/dashboard/clients` - Client management with database
- `/admin` - Admin dashboard with platform stats

### 🔄 Pages Still Using Mock Data (Need Update)
- `/dashboard/documents` - Document management
- `/dashboard/forms` - Form templates
- `/dashboard/tokens` - Token usage
- `/dashboard/subscription` - Subscription management
- `/dashboard/settings` - Profile settings
- `/admin/brokers` - Broker management
- `/admin/subscriptions` - Subscription stats
- `/admin/tokens` - Token allocation
- `/admin/analytics` - Platform analytics

## Subscription Plans

Three plans are pre-configured in the database:

| Plan | Price | Tokens/Month | Features |
|------|-------|--------------|----------|
| **Starter** | $29/month | 100 | Basic onboarding tools |
| **Professional** | $99/month | 500 | Advanced features + AI |
| **Enterprise** | $299/month | Unlimited | Full platform access |

## Token System

- Tokens are consumed for AI actions (document analysis, form generation, etc.)
- Admins can allocate additional tokens to brokers
- Enterprise plan has unlimited tokens
- Token usage is tracked in `token_transactions` table

## Row Level Security (RLS) Policies

All tables have RLS enabled:
- **Brokers** can only view/edit their own data
- **Admins** can view/edit all platform data
- Enforced at database level for maximum security

## Next Steps

1. ✅ Run `schema.sql` in Supabase
2. ✅ Create admin user
3. 🔄 Update remaining pages to use database hooks
4. 🔄 Add file upload functionality for documents
5. 🔄 Implement payment integration
6. 🔄 Add email notifications for onboarding

## Need Help?

- Check Supabase logs for any errors
- Review `lib/types/database.ts` for data structures
- Look at existing implementations in `app/dashboard/page.tsx` and `app/dashboard/clients/page.tsx`
- All hooks use React Query for caching and optimistic updates

## Database ERD

```
profiles (extends auth.users)
├── broker_subscriptions
│   ├── subscription_plans
│   └── clients
│       └── documents
├── form_templates
├── token_transactions
└── activity_log

platform_transactions
broker_invitations
```

## Important Notes

⚠️ **Security**: Never expose your Supabase anon key publicly
⚠️ **RLS**: Always test that brokers can't access other brokers' data
⚠️ **Tokens**: Enterprise users have unlimited tokens (handled in deduct_tokens function)
⚠️ **Cascade Deletes**: Deleting a broker cascades to their subscriptions, clients, documents, etc.

## Support

For issues or questions:
1. Check Supabase dashboard logs
2. Review React Query DevTools
3. Inspect browser console for errors
4. Verify RLS policies are working correctly
