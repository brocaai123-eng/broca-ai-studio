-- Model Predictions table: stores output of all 7 prediction models per ZIP
CREATE TABLE IF NOT EXISTS model_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zip TEXT NOT NULL,
  model_key TEXT NOT NULL,
  predicted_at DATE NOT NULL DEFAULT CURRENT_DATE,
  horizon_days INT NOT NULL DEFAULT 90,
  headline TEXT,
  score DECIMAL(5,2),
  confidence_pct DECIMAL(5,2),
  direction TEXT,
  payload JSONB,
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zip, model_key, predicted_at)
);

ALTER TABLE model_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read model_predictions"
  ON model_predictions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role can manage model_predictions"
  ON model_predictions FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_model_predictions_zip_key
  ON model_predictions(zip, model_key, predicted_at DESC);

-- API usage log for rate limiting external API calls
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL DEFAULT 'rentcast',
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INT NOT NULL DEFAULT 0,
  UNIQUE(api_name, call_date)
);

ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage api_usage_log"
  ON api_usage_log FOR ALL
  TO service_role USING (true) WITH CHECK (true);
