-- =====================================================
-- BROCA AI STUDIO - Complete Database Schema
-- Run these queries in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE (extends auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  company TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'broker' CHECK (role IN ('admin', 'broker')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. SUBSCRIPTION PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  tokens_per_month INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO public.subscription_plans (name, price, tokens_per_month, features) VALUES
  ('Starter', 29.00, 100, '["100 AI tokens/month", "Up to 25 clients", "Email support", "Basic forms"]'),
  ('Professional', 99.00, 500, '["500 AI tokens/month", "Unlimited clients", "Priority support", "Custom forms", "Advanced analytics"]'),
  ('Enterprise', 299.00, 1500, '["1500 AI tokens/month", "Unlimited clients", "Dedicated support", "Custom integrations", "White-label option", "API access"]')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 3. BROKER SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.broker_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  tokens_remaining INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(broker_id)
);

-- Enable RLS
ALTER TABLE public.broker_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can view own subscription" ON public.broker_subscriptions
  FOR SELECT USING (auth.uid() = broker_id);

CREATE POLICY "Admins can manage all subscriptions" ON public.broker_subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 4. CLIENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),
  onboarding_progress INTEGER DEFAULT 0 CHECK (onboarding_progress >= 0 AND onboarding_progress <= 100),
  documents_submitted INTEGER DEFAULT 0,
  documents_required INTEGER DEFAULT 5,
  notes TEXT,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage own clients" ON public.clients
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Admins can view all clients" ON public.clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 5. DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other' CHECK (type IN ('contract', 'id', 'financial', 'property', 'other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('verified', 'pending', 'rejected', 'completed')),
  file_path TEXT,
  file_type TEXT DEFAULT 'pdf' CHECK (file_type IN ('pdf', 'image', 'doc')),
  file_size TEXT,
  file_url TEXT,
  document_type TEXT,
  deal_name TEXT,
  ai_extracted_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage own documents" ON public.documents
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Admins can view all documents" ON public.documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 6. FORM TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.form_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('buyer', 'seller', 'rental', 'general')),
  fields JSONB DEFAULT '[]'::jsonb,
  fields_count INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft')),
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage own forms" ON public.form_templates
  FOR ALL USING (auth.uid() = broker_id);

-- =====================================================
-- 7. TOKEN TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('ai_scan', 'onboarding', 'email', 'form', 'purchase', 'allocation', 'admin_add')),
  description TEXT,
  tokens_amount INTEGER NOT NULL, -- positive for credits, negative for debits
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can view own transactions" ON public.token_transactions
  FOR SELECT USING (auth.uid() = broker_id);

CREATE POLICY "Admins can manage all transactions" ON public.token_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 8. PLATFORM TRANSACTIONS TABLE (for admin revenue tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.platform_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'token_purchase', 'upgrade', 'refund')),
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  plan_name TEXT,
  tokens INTEGER,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.platform_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage transactions" ON public.platform_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 9. BROKER INVITATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.broker_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  plan_id UUID REFERENCES public.subscription_plans(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.broker_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations" ON public.broker_invitations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 10. ACTIVITY LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity" ON public.activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity" ON public.activity_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get broker stats
CREATE OR REPLACE FUNCTION get_broker_stats(broker_uuid UUID)
RETURNS TABLE (
  total_clients BIGINT,
  active_clients BIGINT,
  total_documents BIGINT,
  tokens_remaining INTEGER,
  tokens_used INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.clients WHERE broker_id = broker_uuid),
    (SELECT COUNT(*) FROM public.clients WHERE broker_id = broker_uuid AND status IN ('in_progress', 'completed')),
    (SELECT COUNT(*) FROM public.documents WHERE broker_id = broker_uuid),
    COALESCE((SELECT bs.tokens_remaining FROM public.broker_subscriptions bs WHERE bs.broker_id = broker_uuid), 0),
    COALESCE((SELECT bs.tokens_used FROM public.broker_subscriptions bs WHERE bs.broker_id = broker_uuid), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin platform stats
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE (
  total_brokers BIGINT,
  active_brokers BIGINT,
  monthly_revenue DECIMAL,
  total_tokens_consumed BIGINT,
  total_onboardings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'broker'),
    (SELECT COUNT(*) FROM public.broker_subscriptions WHERE status = 'active'),
    COALESCE((SELECT SUM(amount) FROM public.platform_transactions WHERE created_at >= DATE_TRUNC('month', NOW()) AND status = 'completed'), 0),
    COALESCE((SELECT SUM(tokens_used) FROM public.broker_subscriptions), 0)::BIGINT,
    (SELECT COUNT(*) FROM public.clients WHERE created_at >= DATE_TRUNC('month', NOW()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct tokens
CREATE OR REPLACE FUNCTION deduct_tokens(
  p_broker_id UUID,
  p_amount INTEGER,
  p_action_type TEXT,
  p_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT bs.tokens_remaining INTO v_current_balance
  FROM public.broker_subscriptions bs
  WHERE bs.broker_id = p_broker_id;
  
  -- Check if enough tokens
  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct tokens
  UPDATE public.broker_subscriptions 
  SET tokens_remaining = tokens_remaining - p_amount,
      tokens_used = tokens_used + p_amount,
      updated_at = NOW()
  WHERE broker_id = p_broker_id;
  
  -- Log transaction
  INSERT INTO public.token_transactions (broker_id, action_type, description, tokens_amount, balance_after)
  VALUES (p_broker_id, p_action_type, p_description, -p_amount, v_current_balance - p_amount);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add tokens (admin)
CREATE OR REPLACE FUNCTION add_tokens(
  p_broker_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT 'Admin token allocation'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT tokens_remaining INTO v_current_balance
  FROM public.broker_subscriptions
  WHERE broker_id = p_broker_id;
  
  IF v_current_balance IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Add tokens
  UPDATE public.broker_subscriptions 
  SET tokens_remaining = tokens_remaining + p_amount,
      updated_at = NOW()
  WHERE broker_id = p_broker_id;
  
  -- Log transaction
  INSERT INTO public.token_transactions (broker_id, action_type, description, tokens_amount, balance_after)
  VALUES (p_broker_id, 'admin_add', p_description, p_amount, v_current_balance + p_amount);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clients_broker_id ON public.clients(broker_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_documents_broker_id ON public.documents(broker_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_broker_id ON public.token_transactions(broker_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON public.token_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_created_at ON public.platform_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- =====================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =====================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
