-- Troubleshoot Admin Login Issue
-- Run these queries in Supabase SQL Editor to diagnose the problem

-- ============================================
-- STEP 1: Check if user exists and is confirmed
-- ============================================
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  phone_confirmed_at,
  confirmed_at,
  last_sign_in_at,
  raw_user_meta_data,
  is_sso_user,
  deleted_at
FROM auth.users 
WHERE email = 'admin@brocaai.com';

-- If email_confirmed_at is NULL, the user is NOT confirmed and can't login
-- If deleted_at is NOT NULL, the user was deleted

-- ============================================
-- STEP 2: Check profile exists and has admin role
-- ============================================
SELECT 
  id,
  email,
  role,
  full_name,
  created_at
FROM profiles 
WHERE email = 'admin@brocaai.com';

-- Role should be 'admin' not 'broker'

-- ============================================
-- FIX 1: Confirm the user (if email_confirmed_at is NULL)
-- ============================================
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'admin@brocaai.com'
  AND email_confirmed_at IS NULL;

-- ============================================
-- FIX 2: Reset password to admin123
-- ============================================
-- Note: This uses Supabase's password hashing
-- The password will be hashed automatically

-- First, confirm the user (run FIX 1 above if not already done)
-- Then you can use Supabase Dashboard to reset password:
-- Go to Authentication → Users → Find admin@brocaai.com → Click "..." → Reset Password

-- ============================================
-- FIX 3: Make sure profile has admin role
-- ============================================
UPDATE profiles 
SET role = 'admin'
WHERE email = 'admin@brocaai.com';

-- ============================================
-- FIX 4: If user doesn't exist at all, delete and recreate
-- ============================================
-- Only run this if you want to start fresh

-- Delete from profiles first (if exists)
DELETE FROM profiles WHERE email = 'admin@brocaai.com';

-- Delete from auth.users (if exists)
DELETE FROM auth.users WHERE email = 'admin@brocaai.com';

-- Now go to Supabase Dashboard → Authentication → Users → Add User
-- Email: admin@brocaai.com
-- Password: admin123
-- ✓ Auto Confirm User (MUST CHECK THIS!)
-- Then run the UPDATE profile query above

-- ============================================
-- VERIFICATION: After fixes, check everything
-- ============================================
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.confirmed_at,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'admin@brocaai.com';

-- You should see:
-- ✓ email_confirmed_at: has a timestamp (not NULL)
-- ✓ confirmed_at: has a timestamp (not NULL)
-- ✓ role: 'admin' (not 'broker')

-- ============================================
-- COMMON ISSUES & SOLUTIONS
-- ============================================

-- Issue: email_confirmed_at is NULL
-- Solution: Run FIX 1 above to confirm the user

-- Issue: Role is 'broker' not 'admin'
-- Solution: Run FIX 3 above to change role

-- Issue: User doesn't exist in auth.users
-- Solution: Create user in Supabase Dashboard (Auth → Users → Add User)
--           Make sure to check "Auto Confirm User"!

-- Issue: Profile doesn't exist
-- Solution: The trigger should create it automatically
--           If not, the trigger might not be working
--           Check if schema.sql was run completely

-- Issue: Still can't login after all fixes
-- Solution: 1. Clear browser cookies/localStorage
--           2. Use incognito/private browsing
--           3. Check Network tab in DevTools for actual error
--           4. Verify .env.local has correct Supabase credentials
