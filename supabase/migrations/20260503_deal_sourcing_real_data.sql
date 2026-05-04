-- =====================================================
-- DEAL SOURCING (Real Data) — Phase 2 Extension
-- =====================================================

-- =====================================================
-- 1) PROPERTIES (cached property intelligence)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rentcast_property_id TEXT UNIQUE,
  formatted_address TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),

  bedrooms INTEGER,
  bathrooms DECIMAL(4,1),
  square_footage INTEGER,
  lot_size INTEGER,
  year_built INTEGER,
  property_type TEXT,
  zoning TEXT,
  assessor_id TEXT,

  owner_names JSONB DEFAULT '[]'::jsonb,
  owner_mailing_address JSONB,
  owner_occupied BOOLEAN,

  last_sale_date TIMESTAMPTZ,
  last_sale_price DECIMAL(12,2),

  estimated_value DECIMAL(12,2),
  estimated_value_low DECIMAL(12,2),
  estimated_value_high DECIMAL(12,2),
  avm_last_updated_at TIMESTAMPTZ,

  -- Signals (filled by pipelines / integrations)
  tax_delinquent BOOLEAN,
  foreclosure_case BOOLEAN,
  probate_case BOOLEAN,
  divorce_case BOOLEAN,
  code_violations_count INTEGER,
  extended_dom BOOLEAN,
  below_value BOOLEAN,
  satellite_condition_flag BOOLEAN,

  motivated_seller_score INTEGER CHECK (motivated_seller_score >= 0 AND motivated_seller_score <= 100),
  motivated_seller_breakdown JSONB DEFAULT '[]'::jsonb,
  motivated_seller_label TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_zip ON public.properties(zip);
CREATE INDEX IF NOT EXISTS idx_properties_updated_at ON public.properties(updated_at DESC);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view properties" ON public.properties
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 2) DEAL ALERT CONFIGURATION
-- =====================================================
CREATE TABLE IF NOT EXISTS public.deal_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  zip_codes TEXT[] NOT NULL DEFAULT '{}',
  min_market_score INTEGER CHECK (min_market_score >= 0 AND min_market_score <= 100),
  min_motivated_score INTEGER CHECK (min_motivated_score >= 0 AND min_motivated_score <= 100),
  max_asking_price DECIMAL(12,2),
  property_types TEXT[] DEFAULT '{}',
  channels JSONB DEFAULT '[]'::jsonb, -- ["email","dashboard","sms"]
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deal_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own deal alerts" ON public.deal_alerts
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_deal_alerts_user ON public.deal_alerts(user_id);

-- =====================================================
-- 3) ALERT FEED (log)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.alert_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  zip TEXT,
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  reference_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own alerts" ON public.alert_log
  FOR SELECT USING (auth.uid() IS NOT NULL AND (user_id IS NULL OR auth.uid() = user_id));
CREATE POLICY "Service role inserts alerts" ON public.alert_log
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_alert_log_user_created ON public.alert_log(user_id, created_at DESC);

