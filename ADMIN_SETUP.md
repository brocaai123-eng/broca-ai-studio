# Admin User Setup Guide

Follow these steps to create your admin user and access the admin panel at `/admin`.

## ⚡ Quick Start (Easiest Method)

### Step 1: Create User in Supabase Dashboard
1. Go to your **Supabase Project Dashboard**
2. Click **Authentication** in the left sidebar
3. Click **Users** tab
4. Click **"Add User"** button → Select **"Create new user"**
5. Fill in:
   - **Email**: `admin@brocaai.com`
   - **Password**: `admin123`
   - **✓ Check "Auto Confirm User"** (important!)
6. Click **"Create User"**

### Step 2: Make User Admin
1. Stay in Supabase Dashboard
2. Go to **Table Editor** → Select **`profiles`** table
3. Find the row with email `admin@brocaai.com`
   - If you don't see it, wait a few seconds and refresh (trigger creates it automatically)
4. Click the **Edit** button (pencil icon) on that row
5. Change `role` from `broker` to `admin`
6. Click **Save**

### Step 3: Login
1. Go to your application: `http://localhost:3000/login`
2. Login with:
   - **Email**: `admin@brocaai.com`
   - **Password**: `admin123`
3. Navigate to `/admin` - you should see the admin dashboard! 🎉

---

## Alternative Method: Using SQL

If you prefer SQL, after running the schema.sql:
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"+ New Query"**
3. Paste this SQL:

```sql
-- Update user role to admin
UPDATE profiles 
SET role = 'admin'
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'admin@brocaai.com'
);

-- Verify admin was created
SELECT 
  p.id,
  p.email,
  p.role,
  p.created_at
FROM profiles p
WHERE p.email = 'admin@brocaai.com';
```

4. Click **Run**
5. You should see the admin user in the results

---

## Troubleshooting

### Issue: Can't access `/admin`
**Solution**: 
1. Make sure you ran `schema.sql` first (this creates the profiles table)
2. Verify the role is set to `'admin'` (not `'Admin'` - it's case sensitive)
3. Clear cookies and log out/log in again
4. Check browser console for errors

### Issue: Redirected to `/dashboard` when accessing `/admin`
**Solution**: 
1. Your role is not 'admin' - check Supabase profiles table
2. Make sure middleware is working - check `lib/supabase/middleware.ts`
3. Clear browser cache and cookies

### Issue: Profile not created after signup
**Solution**: 
1. The trigger in `schema.sql` creates profiles automatically
2. Make sure you ran the complete `schema.sql` file
3. Check Supabase logs for trigger errors

### Issue: "Role not found" error
**Solution**: 
1. The role column should exist in profiles table
2. Re-run the schema.sql if needed
3. Check that the enum type was created: `user_role`

---

## Security Notes

⚠️ **Important**: For production:
1. **Change the default password** immediately after first login
2. Use a strong, unique password
3. Enable 2FA in Supabase if available
4. Never commit credentials to Git
5. Use environment variables for sensitive data

---

## How Admin Access Works

1. **Middleware Protection**: The `/admin` route is protected by middleware
2. **Role Check**: Middleware checks if user's role is 'admin'
3. **Redirect**: Non-admin users are redirected to `/dashboard`
4. **Database Level**: RLS policies give admins access to all data

---

## Admin Capabilities

Once you have admin access, you can:
- ✅ View platform-wide statistics
- ✅ Manage all brokers
- ✅ Allocate tokens to brokers
- ✅ View subscription revenue
- ✅ Access activity logs
- ✅ Send broker invitations
- ✅ View all clients across platform

---

## Quick SQL Commands

### Check if user is admin:
```sql
SELECT email, role 
FROM profiles 
WHERE email = 'admin@brocaai.com';
```

### Make any user admin:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### List all admins:
```sql
SELECT email, role, full_name, created_at 
FROM profiles 
WHERE role = 'admin';
```

### Remove admin access:
```sql
UPDATE profiles 
SET role = 'broker' 
WHERE email = 'admin@brocaai.com';
```

---

## Files Reference

- **Middleware**: `lib/supabase/middleware.ts` - Handles route protection and role checking
- **Admin Page**: `app/admin/page.tsx` - Admin dashboard
- **Database Schema**: `supabase/schema.sql` - Creates profiles table with role column
- **Admin Hooks**: `lib/hooks/use-admin.ts` - React Query hooks for admin operations

---

## Next Steps

After creating your admin account:
1. ✅ Login with admin credentials
2. ✅ Access `/admin` to view dashboard
3. ✅ Explore admin features (brokers, tokens, revenue)
4. ✅ Create test broker accounts
5. ✅ Change admin password in settings
6. ✅ Invite real brokers to the platform

---

## Need Help?

- Check Supabase logs for errors
- Verify `schema.sql` was run completely
- Ensure profiles table exists with role column
- Check middleware logs in terminal
- Inspect browser Network tab for 401/403 errors
