-- =====================================================
-- FIX: RLS Policy Issue Preventing Admin Login
-- This fixes the middleware so it can check user roles
-- =====================================================

-- The problem: Middleware can't check if user is admin because RLS blocks it
-- Solution: Add policy allowing users to read their own profile role

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create new policy that allows users to see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Also ensure admins can see all profiles (keep existing)
-- This one should already exist, but recreate if needed
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Verify policies are correct
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- =====================================================
-- Now update your user to admin role
-- =====================================================

-- Replace with your actual email
UPDATE profiles 
SET role = 'admin'
WHERE email = 'admin@brocaai.com'
RETURNING id, email, role;

-- Confirm user is confirmed (only update email_confirmed_at)
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'admin@brocaai.com'
RETURNING id, email, email_confirmed_at;

-- =====================================================
-- VERIFY EVERYTHING WORKS
-- =====================================================

-- Check role is admin
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.role,
  p.role = 'admin' as is_admin_exact
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
WHERE u.email = 'admin@brocaai.com';

-- Should show:
-- ✓ email_confirmed_at: has timestamp
-- ✓ role: 'admin'
-- ✓ is_admin_exact: true

-- =====================================================
-- TEST THE MIDDLEWARE QUERY
-- =====================================================

-- This simulates what the middleware does
-- Replace 'YOUR_USER_ID' with your actual user ID from above query

-- SELECT role FROM profiles WHERE id = 'YOUR_USER_ID';

-- Should return: admin
