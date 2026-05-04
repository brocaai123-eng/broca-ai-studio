-- =====================================================
-- MARKET INTELLIGENCE — Forecasts, Layers, Comparable ZIPs
-- Phase 2 Extension (UX Blueprint Tabs 2-4)
-- =====================================================

-- =====================================================
-- 1) FORECASTS (Prophet output cache)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.forecasts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  zip TEXT NOT NULL,
  horizon_days INTEGER NOT NULL DEFAULT 90,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  predicted_series JSONB NOT NULL DEFAULT '[]'::jsonb,
  predicted_change_pct DECIMAL(6,2),
  predicted_value_end DECIMAL(12,2),
  confidence_pct DECIMAL(5,2),
  model_version TEXT,
  data_days_collected INTEGER DEFAULT 0,
  required_days INTEGER DEFAULT 180,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zip, horizon_days)
);

CREATE INDEX IF NOT EXISTS idx_forecasts_zip_updated_at ON public.forecasts(zip, updated_at DESC);

ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view forecasts" ON public.forecasts
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role upserts forecasts" ON public.forecasts
  FOR ALL WITH CHECK (true);

-- =====================================================
-- 2) INTELLIGENCE LAYERS (Tab 3)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.intelligence_layers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  zip TEXT NOT NULL,
  layer_key TEXT NOT NULL CHECK (layer_key IN ('crime','grid','traffic','news','people')),
  as_of_date DATE NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  headline TEXT,
  badge TEXT,
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low','medium','high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zip, layer_key, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_layers_zip_date ON public.intelligence_layers(zip, as_of_date DESC);
CREATE INDEX IF NOT EXISTS idx_layers_key ON public.intelligence_layers(layer_key);

ALTER TABLE public.intelligence_layers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view intelligence layers" ON public.intelligence_layers
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role upserts intelligence layers" ON public.intelligence_layers
  FOR ALL WITH CHECK (true);

-- =====================================================
-- 3) COMPARABLE ZIPS (Tab 4)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.comparable_zips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  base_zip TEXT NOT NULL,
  zip TEXT NOT NULL,
  city TEXT,
  state TEXT,
  aria_score INTEGER CHECK (aria_score >= 0 AND aria_score <= 100),
  trend TEXT CHECK (trend IN ('up','down','stable')),
  median_price DECIMAL(12,2),
  rank INTEGER,
  as_of_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(base_zip, zip, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_comparables_base_date ON public.comparable_zips(base_zip, as_of_date DESC, rank ASC);

ALTER TABLE public.comparable_zips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view comparable zips" ON public.comparable_zips
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role upserts comparable zips" ON public.comparable_zips
  FOR ALL WITH CHECK (true);

