-- Mail log: allow failed/custom sends without a matching NPI row.
ALTER TABLE public.provider_mail_sends DROP CONSTRAINT IF EXISTS provider_mail_sends_npi_fkey;
ALTER TABLE public.provider_mail_sends ALTER COLUMN npi DROP NOT NULL;

ALTER TABLE public.provider_mail_sends DROP CONSTRAINT IF EXISTS provider_mail_sends_status_check;
ALTER TABLE public.provider_mail_sends
  ADD CONSTRAINT provider_mail_sends_status_check
  CHECK (status IN (
    'queued', 'processed', 'rendered', 'in_transit',
    'delivered', 'returned', 'failed', 'canceled'
  ));

-- Bias learned from resolved prediction_feedback (local trainer).
CREATE TABLE IF NOT EXISTS public.model_calibration (
  metric TEXT NOT NULL,
  model_version TEXT NOT NULL,
  sample_count INT NOT NULL DEFAULT 0,
  bias NUMERIC,
  trained_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (metric, model_version)
);

ALTER TABLE public.model_calibration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage model_calibration" ON public.model_calibration;
CREATE POLICY "Service role can manage model_calibration"
  ON public.model_calibration FOR ALL
  TO service_role USING (true) WITH CHECK (true);
