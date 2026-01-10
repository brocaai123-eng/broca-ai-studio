-- Create Admin User Script for BROCA AI Studio
-- This script creates an admin user with email: admin@brocaai.com and password: admin123

-- IMPORTANT: Run this AFTER you have run the main schema.sql file
-- IMPORTANT: Change the password after first login for security

-- ============================================
-- METHOD 1: Create User via Supabase Dashboard (RECOMMENDED)
-- ============================================
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → "Create new user"
-- 3. Enter:
--    Email: admin@brocaai.com
--    Password: admin123
--    ✓ Auto Confirm User (check this box)
-- 4. Click "Create User"
-- 5. Then run the SQL below to make them admin

-- ============================================
-- METHOD 2: Use SQL to Make Existing User Admin
-- ============================================

-- After creating the user via dashboard, run this to make them admin:
UPDATE profiles 
SET role = 'admin'
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'admin@brocaai.com'
);

-- Verify the admin was created successfully:
SELECT 
  p.id,
  p.email,
  p.role,
  p.full_name,
  p.created_at
FROM profiles p
WHERE p.email = 'admin@brocaai.com';

-- ============================================
-- METHOD 3: Create User Programmatically (Alternative)
-- ============================================
-- If you have admin API access, you can also create users via the Supabase Admin API
-- This requires using the service_role key (keep it secret!)

-- Example using curl (replace YOUR_PROJECT_URL and SERVICE_ROLE_KEY):
-- curl -X POST 'https://YOUR_PROJECT_URL.supabase.co/auth/v1/admin/users' \
-- -H "apikey: YOUR_SERVICE_ROLE_KEY" \
-- -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
-- -H "Content-Type: application/json" \
-- -d '{
--   "email": "admin@brocaai.com",
--   "password": "admin123",
--   "email_confirm": true,
--   "user_metadata": {
--     "full_name": "Admin User"
--   }
-- }'

-- Then run the UPDATE query above to set role to admin

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- Check if user exists in auth.users:
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email = 'admin@brocaai.com';

-- Check if profile exists:
SELECT * FROM profiles WHERE email = 'admin@brocaai.com';

-- If profile exists but role is not admin, update it:
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@brocaai.com';

-- If profile doesn't exist but user exists in auth.users, the trigger should create it
-- You can manually create it if needed:
-- INSERT INTO profiles (id, email, role, full_name)
-- SELECT id, email, 'admin', 'Admin User'
-- FROM auth.users 
-- WHERE email = 'admin@brocaai.com'
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- ============================================
-- SECURITY NOTES
-- ============================================
-- ⚠️ After first login:
-- 1. Change the password immediately
-- 2. Update your email to a real one
-- 3. Enable 2FA if available
-- 4. Never commit this password to Git
