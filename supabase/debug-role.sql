-- DEBUG: Check exactly what the middleware sees
-- Run this to see the exact role value being stored

SELECT 
  id,
  email,
  role,
  -- Check for hidden characters
  LENGTH(role) as role_length,
  -- Check byte representation
  encode(role::bytea, 'hex') as role_hex,
  -- Exact comparison
  role = 'admin' as exact_match,
  role::text = 'admin'::text as text_match,
  -- Case insensitive
  LOWER(role) = 'admin' as lowercase_match,
  -- With trim
  TRIM(role) = 'admin' as trimmed_match
FROM profiles 
WHERE email = 'admin@brocaai.com';

-- If exact_match is FALSE but trimmed_match is TRUE, there's whitespace
-- If lowercase_match is TRUE but exact_match is FALSE, there's a case issue

-- FIX: Force exact value
UPDATE profiles 
SET role = 'admin'
WHERE email = 'admin@brocaai.com'
RETURNING id, email, role, role = 'admin' as is_admin;
