-- =====================================================
-- MARKETPLACE SYSTEM - Phase 2 Migration
-- =====================================================

-- =====================================================
-- 1. MARKETPLACE LISTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('real_estate', 'boat', 'broker_profile')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'sold', 'expired', 'pending_review')),
  title TEXT NOT NULL,
  description TEXT,
  asking_price DECIMAL(12,2),
  aria_score INTEGER CHECK (aria_score >= 0 AND aria_score <= 100),
  below_market_pct DECIMAL(5,2),
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  photos JSONB DEFAULT '[]'::jsonb,
  specs JSONB DEFAULT '{}'::jsonb,
  neighborhood_direction TEXT CHECK (neighborhood_direction IN ('ascending', 'declining', 'stable')),
  estimated_days_to_close INTEGER,
  estimated_value DECIMAL(12,2),
  crime_score INTEGER,
  motivated_seller_score INTEGER CHECK (motivated_seller_score >= 0 AND motivated_seller_score <= 100),
  price_reduced_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live listings" ON public.marketplace_listings
  FOR SELECT USING (status = 'live');

CREATE POLICY "Users can manage own listings" ON public.marketplace_listings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all listings" ON public.marketplace_listings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX idx_listings_asset_type ON public.marketplace_listings(asset_type);
CREATE INDEX idx_listings_status ON public.marketplace_listings(status);
CREATE INDEX idx_listings_zip ON public.marketplace_listings(location_zip);
CREATE INDEX idx_listings_aria_score ON public.marketplace_listings(aria_score DESC);
CREATE INDEX idx_listings_asking_price ON public.marketplace_listings(asking_price);
CREATE INDEX idx_listings_created_at ON public.marketplace_listings(created_at DESC);
CREATE INDEX idx_listings_user_id ON public.marketplace_listings(user_id);

-- =====================================================
-- 2. MARKETPLACE SAVED LISTINGS (Bookmarks)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketplace_saved_listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE public.marketplace_saved_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bookmarks" ON public.marketplace_saved_listings
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 3. BROKER PROFILES (Extended profiles for directory)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.broker_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  license_number TEXT,
  brokerage_name TEXT,
  specialties TEXT[] DEFAULT '{}',
  zip_codes_served TEXT[] DEFAULT '{}',
  cover_photo_url TEXT,
  bio TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  linkedin_url TEXT,
  aria_performance_score INTEGER CHECK (aria_performance_score >= 0 AND aria_performance_score <= 100),
  total_listings INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  avg_days_to_close INTEGER,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.broker_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view broker profiles" ON public.broker_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own broker profile" ON public.broker_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all broker profiles" ON public.broker_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX idx_broker_profiles_user_id ON public.broker_profiles(user_id);
CREATE INDEX idx_broker_profiles_performance ON public.broker_profiles(aria_performance_score DESC);

-- =====================================================
-- 4. LISTING VIEWS (Social proof tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.listing_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewer_ip TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert views" ON public.listing_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Listing owners can view their listing views" ON public.listing_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_listings
      WHERE id = listing_id AND user_id = auth.uid()
    )
  );

CREATE INDEX idx_listing_views_listing ON public.listing_views(listing_id);
CREATE INDEX idx_listing_views_date ON public.listing_views(viewed_at DESC);

-- =====================================================
-- 5. PREDICTION FEEDBACK (ML model accuracy tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.prediction_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  zip TEXT NOT NULL,
  prediction_date DATE NOT NULL,
  metric TEXT NOT NULL,
  predicted_value DECIMAL(12,4),
  actual_value DECIMAL(12,4),
  model_version TEXT,
  confidence_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prediction_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prediction feedback" ON public.prediction_feedback
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX idx_prediction_feedback_zip ON public.prediction_feedback(zip);
CREATE INDEX idx_prediction_feedback_date ON public.prediction_feedback(prediction_date DESC);

-- =====================================================
-- 6. DEAL SOURCING SIGNALS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.deal_sourcing_signals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_address TEXT,
  zip TEXT NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'distressed_roof', 'overgrown', 'vacant', 'pool_neglect',
    'tax_delinquent', 'foreclosure', 'probate', 'divorce',
    'code_violation', 'price_below_value', 'extended_dom',
    'absentee_owner', 'long_hold'
  )),
  confidence DECIMAL(5,2),
  source_api TEXT,
  satellite_image_url TEXT,
  notes TEXT,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deal_sourcing_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view signals" ON public.deal_sourcing_signals
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage signals" ON public.deal_sourcing_signals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX idx_deal_signals_zip ON public.deal_sourcing_signals(zip);
CREATE INDEX idx_deal_signals_type ON public.deal_sourcing_signals(signal_type);
CREATE INDEX idx_deal_signals_detected ON public.deal_sourcing_signals(detected_at DESC);

-- =====================================================
-- 7. MARKET SNAPSHOTS (Daily data for Prophet)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.market_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  zip TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  median_price DECIMAL(12,2),
  active_listings INTEGER,
  avg_days_on_market INTEGER,
  new_listings INTEGER,
  months_of_supply DECIMAL(5,2),
  price_per_sqft DECIMAL(8,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zip, snapshot_date)
);

ALTER TABLE public.market_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view snapshots" ON public.market_snapshots
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_snapshots_zip_date ON public.market_snapshots(zip, snapshot_date DESC);

-- =====================================================
-- 8. CRIME RECORDS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crime_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  zip TEXT NOT NULL,
  record_date DATE NOT NULL,
  crime_type TEXT,
  incident_count INTEGER DEFAULT 1,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.crime_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view crime records" ON public.crime_records
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_crime_zip_date ON public.crime_records(zip, record_date DESC);

-- =====================================================
-- 9. ENERGY DATA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.energy_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  zip TEXT NOT NULL,
  record_date DATE NOT NULL,
  consumption DECIMAL(12,2),
  capacity_pct DECIMAL(5,2),
  utility_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.energy_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view energy data" ON public.energy_data
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_energy_zip ON public.energy_data(zip, record_date DESC);

-- =====================================================
-- 10. TRAFFIC DATA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.traffic_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  road_segment TEXT,
  zip TEXT NOT NULL,
  daily_vehicle_count INTEGER,
  record_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.traffic_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view traffic data" ON public.traffic_data
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_traffic_zip ON public.traffic_data(zip, record_date DESC);

-- =====================================================
-- 11. NEWS SIGNALS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.news_signals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  zip TEXT,
  signal_date DATE NOT NULL,
  headline TEXT NOT NULL,
  source_url TEXT,
  sentiment_score DECIMAL(5,2),
  signal_type TEXT,
  impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'breaking')),
  confidence DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.news_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view news signals" ON public.news_signals
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_news_zip ON public.news_signals(zip, signal_date DESC);

-- =====================================================
-- 12. PREDICTIONS (Prophet + Scikit-learn outputs)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  zip TEXT NOT NULL,
  prediction_date DATE NOT NULL,
  metric TEXT NOT NULL,
  predicted_value DECIMAL(12,4),
  confidence_score DECIMAL(5,2),
  actual_value DECIMAL(12,4),
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view predictions" ON public.predictions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_predictions_zip ON public.predictions(zip, prediction_date DESC);

-- =====================================================
-- 13. CONTACT MESSAGES (Marketplace contact forms)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  broker_profile_id UUID REFERENCES public.broker_profiles(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages sent to them" ON public.contact_messages
  FOR SELECT USING (auth.uid() = to_user_id);

CREATE POLICY "Anyone can send messages" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_messages_to ON public.contact_messages(to_user_id, is_read);

-- =====================================================
-- Add model_version to existing market_analyses
-- =====================================================
DO $$ BEGIN
  ALTER TABLE public.market_analyses ADD COLUMN IF NOT EXISTS model_version TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- =====================================================
-- GRANTS
-- =====================================================
GRANT ALL ON public.marketplace_listings TO authenticated;
GRANT ALL ON public.marketplace_saved_listings TO authenticated;
GRANT ALL ON public.broker_profiles TO authenticated;
GRANT ALL ON public.listing_views TO authenticated;
GRANT ALL ON public.prediction_feedback TO authenticated;
GRANT ALL ON public.deal_sourcing_signals TO authenticated;
GRANT ALL ON public.market_snapshots TO authenticated;
GRANT ALL ON public.crime_records TO authenticated;
GRANT ALL ON public.energy_data TO authenticated;
GRANT ALL ON public.traffic_data TO authenticated;
GRANT ALL ON public.news_signals TO authenticated;
GRANT ALL ON public.predictions TO authenticated;
GRANT ALL ON public.contact_messages TO authenticated;

-- Allow anonymous users to read live listings
GRANT SELECT ON public.marketplace_listings TO anon;
GRANT SELECT ON public.broker_profiles TO anon;
