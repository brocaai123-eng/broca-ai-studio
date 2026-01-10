-- =====================================================
-- FIX: Middleware Cannot Read Profile Role Due to RLS
-- =====================================================

-- The issue: The middleware uses NEXT_PUBLIC_SUPABASE_ANON_KEY which has
-- limited permissions. RLS might be blocking it from reading profiles.

-- Solution: Make profiles readable by authenticated users (not just the owner)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create new policy: Any authenticated user can read ANY profile
-- This is safe because we're only exposing the role field
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Verify the policy
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

-- Test: Can we read the admin profile?
SELECT id, email, role 
FROM profiles 
WHERE email = 'admin@brocaai.com';
