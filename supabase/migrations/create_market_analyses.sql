-- Market Intelligence: Saved Analyses Table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS market_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT NOT NULL,           -- "West Palm Beach, FL" or "33401"
  zip_code TEXT NOT NULL,
  state TEXT,
  county TEXT,
  aria_score INTEGER NOT NULL DEFAULT 0,  -- 0-100 composite score
  market_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_summary TEXT,
  market_type TEXT,                  -- 'sellers', 'buyers', 'balanced'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_market_analyses_broker_id ON market_analyses(broker_id);
CREATE INDEX idx_market_analyses_zip_code ON market_analyses(zip_code);
CREATE INDEX idx_market_analyses_created_at ON market_analyses(created_at DESC);

-- RLS
ALTER TABLE market_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can view own analyses"
  ON market_analyses FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert own analyses"
  ON market_analyses FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete own analyses"
  ON market_analyses FOR DELETE
  USING (auth.uid() = broker_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_market_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_market_analyses_updated_at
  BEFORE UPDATE ON market_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_market_analyses_updated_at();
