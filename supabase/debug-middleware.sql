-- =====================================================
-- DEBUG: Check what middleware sees
-- =====================================================

-- STEP 1: Find your user ID
SELECT 
  id,
  email,
  email_confirmed_at
FROM auth.users 
WHERE email = 'admin@brocaai.com';

-- Copy the 'id' value from above and use it in the next queries

-- STEP 2: Test the EXACT query middleware uses
-- Replace 'YOUR_USER_ID_HERE' with the actual ID from STEP 1
-- SELECT role FROM profiles WHERE id = 'YOUR_USER_ID_HERE';

-- STEP 3: Check for any whitespace or encoding issues
SELECT 
  id,
  email,
  role,
  LENGTH(role) as role_length,
  role = 'admin' as is_admin_exact,
  TRIM(role) = 'admin' as is_admin_trimmed,
  encode(role::bytea, 'hex') as role_hex
FROM profiles 
WHERE email = 'admin@brocaai.com';

-- Expected results:
-- role_length: 5 (for 'admin')
-- is_admin_exact: true
-- is_admin_trimmed: true
-- role_hex: 61646d696e (hex for 'admin')

-- If role_hex is different, there's an encoding issue

-- STEP 4: Force clean update
UPDATE profiles 
SET role = 'admin'::text
WHERE email = 'admin@brocaai.com'
RETURNING 
  id,
  email,
  role,
  LENGTH(role) as len,
  role = 'admin' as exact_match;

-- STEP 5: Check all users and their roles
SELECT 
  u.email,
  p.role,
  p.role = 'admin' as is_admin
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;
