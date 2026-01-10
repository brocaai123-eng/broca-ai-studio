-- Quick check: What is the admin user's role?
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  LENGTH(p.role) as role_length,
  p.role = 'admin' as is_admin,
  p.role = 'broker' as is_broker
FROM profiles p
WHERE p.email = 'admin@brocaai.com';
