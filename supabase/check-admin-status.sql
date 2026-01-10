-- =====================================================
-- ADMIN USER SETUP - Complete Solution
-- Run these queries in Supabase SQL Editor
-- =====================================================

-- STEP 1: Check if admin user already exists
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

-- =====================================================
-- OPTION A: Fix Existing User (if you see a user above)
-- =====================================================

-- If the user exists but role is 'broker', fix it:
UPDATE profiles 
SET role = 'admin'
WHERE email = 'admin@brocaai.com';

-- If user exists but NOT confirmed, confirm them:
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'admin@brocaai.com'
  AND email_confirmed_at IS NULL;

-- =====================================================
-- OPTION B: Create Fresh Admin User (if no user exists)
-- =====================================================

-- IMPORTANT: You CANNOT create users directly via SQL due to password hashing
-- You MUST use Supabase Dashboard or Admin API

-- METHOD 1: Using Supabase Dashboard (RECOMMENDED)
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → "Create new user"
-- 3. Email: admin@brocaai.com
-- 4. Password: admin123
-- 5. ✓ CHECK "Auto Confirm User" (CRITICAL!)
-- 6. Click "Create User"
-- 7. Then run this SQL to make them admin:

UPDATE profiles 
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@brocaai.com'
);

-- =====================================================
-- OPTION C: Create Multiple Admins
-- =====================================================

-- To make ANY existing user an admin, use their email:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- To make a user admin by their ID:
-- UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid-here';

-- =====================================================
-- VERIFICATION: Check Admin Status
-- =====================================================

-- This should show role = 'admin' and confirmed dates
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.confirmed_at,
  p.role,
  p.full_name,
  p.created_at
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
WHERE p.role = 'admin';

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- Check if role constraint is working:
SELECT 
  table_name,
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE table_name = 'profiles';

-- Verify the role value is exactly 'admin' (case-sensitive):
SELECT 
  email,
  role,
  LENGTH(role) as role_length,
  role = 'admin' as is_admin_exact,
  LOWER(role) = 'admin' as is_admin_lower
FROM profiles
WHERE email = 'admin@brocaai.com';

-- If role shows 'broker' or something unexpected:
-- 1. Check for whitespace: role might be 'admin ' with trailing space
-- 2. Run: UPDATE profiles SET role = TRIM('admin') WHERE email = 'admin@brocaai.com';

-- Force update with exact value:
UPDATE profiles 
SET role = 'admin'::text
WHERE email = 'admin@brocaai.com'
RETURNING id, email, role;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

-- Run this after all fixes to confirm everything works:
SELECT 
  'User exists in auth.users' as check_name,
  COUNT(*) as result
FROM auth.users 
WHERE email = 'admin@brocaai.com'

UNION ALL

SELECT 
  'User is confirmed',
  COUNT(*)
FROM auth.users 
WHERE email = 'admin@brocaai.com' AND email_confirmed_at IS NOT NULL

UNION ALL

SELECT 
  'Profile exists',
  COUNT(*)
FROM profiles 
WHERE email = 'admin@brocaai.com'

UNION ALL

SELECT 
  'Profile has admin role',
  COUNT(*)
FROM profiles 
WHERE email = 'admin@brocaai.com' AND role = 'admin';

-- All 4 checks should return 1
-- If any return 0, that's the problem to fix
