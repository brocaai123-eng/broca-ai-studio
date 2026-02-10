-- =====================================================
-- BROCA AI STUDIO - Affiliate System Migration
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. AFFILIATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 25.00,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
  payout_method TEXT CHECK (payout_method IN ('stripe', 'ach', 'paypal')),
  payout_email TEXT,
  stripe_connect_id TEXT,
  minimum_payout DECIMAL(10,2) DEFAULT 50.00,
  total_clicks INTEGER DEFAULT 0,
  bio TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- Affiliates can view own profile
CREATE POLICY "Affiliates can view own profile" ON public.affiliates
  FOR SELECT USING (auth.uid() = user_id);

-- Affiliates can update own profile  
CREATE POLICY "Affiliates can update own profile" ON public.affiliates
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "Admins can manage all affiliates" ON public.affiliates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 2. AFFILIATE REFERRALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referred_email TEXT NOT NULL,
  referred_name TEXT,
  status TEXT DEFAULT 'clicked' CHECK (status IN ('clicked', 'signed_up', 'trial', 'active', 'churned', 'refunded')),
  plan_name TEXT,
  plan_price DECIMAL(10,2) DEFAULT 0,
  mrr DECIMAL(10,2) DEFAULT 0,
  commission_rate DECIMAL(5,2),
  monthly_commission DECIMAL(10,2) DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  signed_up_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  churned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own referrals" ON public.affiliate_referrals
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all referrals" ON public.affiliate_referrals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 3. AFFILIATE COMMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  referral_id UUID REFERENCES public.affiliate_referrals(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  referred_email TEXT,
  plan_name TEXT,
  mrr_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own commissions" ON public.affiliate_commissions
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all commissions" ON public.affiliate_commissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 4. AFFILIATE PAYOUTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payout_method TEXT NOT NULL,
  payout_reference TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own payouts" ON public.affiliate_payouts
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all payouts" ON public.affiliate_payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 5. AFFILIATE RESOURCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.affiliate_resources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('video', 'pdf', 'document', 'link')),
  url TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.affiliate_resources ENABLE ROW LEVEL SECURITY;

-- Everyone can view resources
CREATE POLICY "Authenticated users can view resources" ON public.affiliate_resources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage resources" ON public.affiliate_resources
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON public.affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate ON public.affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status ON public.affiliate_referrals(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_period ON public.affiliate_commissions(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON public.affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate ON public.affiliate_payouts(affiliate_id);

-- =====================================================
-- UPDATE PROFILES TABLE
-- =====================================================
-- Add 'affiliate' role to profiles check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'broker', 'affiliate'));

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get affiliate stats
CREATE OR REPLACE FUNCTION get_affiliate_stats(affiliate_uuid UUID)
RETURNS TABLE (
  active_referrals BIGINT,
  total_referrals BIGINT,
  monthly_commission DECIMAL,
  lifetime_earned DECIMAL,
  pending_balance DECIMAL,
  paid_balance DECIMAL,
  conversion_rate DECIMAL,
  total_clicks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.affiliate_referrals WHERE affiliate_id = affiliate_uuid AND status = 'active'),
    (SELECT COUNT(*) FROM public.affiliate_referrals WHERE affiliate_id = affiliate_uuid),
    COALESCE((SELECT SUM(commission_amount) FROM public.affiliate_commissions 
      WHERE affiliate_id = affiliate_uuid 
      AND period_start <= CURRENT_DATE AND period_end >= CURRENT_DATE
      AND status IN ('pending', 'approved')), 0),
    COALESCE((SELECT SUM(commission_amount) FROM public.affiliate_commissions 
      WHERE affiliate_id = affiliate_uuid 
      AND status IN ('approved', 'paid')), 0),
    COALESCE((SELECT SUM(commission_amount) FROM public.affiliate_commissions 
      WHERE affiliate_id = affiliate_uuid 
      AND status IN ('pending', 'approved')), 0),
    COALESCE((SELECT SUM(amount) FROM public.affiliate_payouts 
      WHERE affiliate_id = affiliate_uuid 
      AND status = 'completed'), 0),
    CASE 
      WHEN (SELECT aff.total_clicks FROM public.affiliates aff WHERE aff.id = affiliate_uuid) > 0 
      THEN ROUND(
        (SELECT COUNT(*)::DECIMAL FROM public.affiliate_referrals WHERE affiliate_id = affiliate_uuid AND status IN ('active', 'trial')) / 
        GREATEST((SELECT aff2.total_clicks FROM public.affiliates aff2 WHERE aff2.id = affiliate_uuid), 1) * 100, 1
      )
      ELSE 0
    END,
    COALESCE((SELECT aff3.total_clicks FROM public.affiliates aff3 WHERE aff3.id = affiliate_uuid), 0)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to atomically increment affiliate clicks
CREATE OR REPLACE FUNCTION increment_affiliate_clicks(affiliate_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.affiliates 
  SET total_clicks = COALESCE(total_clicks, 0) + 1,
      updated_at = NOW()
  WHERE id = affiliate_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default resources
INSERT INTO public.affiliate_resources (title, description, type, url, is_featured, sort_order) VALUES
  ('BrocaAI Product Demo', 'Watch a 3-minute demo of BrocaAI in action. Perfect for sharing with potential customers.', 'video', 'https://www.youtube.com/watch?v=demo', TRUE, 1),
  ('Affiliate One-Pager', 'A professional PDF you can share that explains BrocaAI benefits and pricing.', 'pdf', '/resources/broca-one-pager.pdf', TRUE, 2),
  ('Affiliate Program Terms', 'Read the full terms and conditions of the BrocaAI affiliate program.', 'document', '/resources/affiliate-terms.pdf', FALSE, 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_resources TO authenticated;
