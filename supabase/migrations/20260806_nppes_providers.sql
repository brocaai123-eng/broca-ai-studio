-- CMS / NPPES provider registry + physical mail tracking

CREATE TABLE IF NOT EXISTS nppes_providers (
  npi TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('1', '2')),
  provider_last_name TEXT,
  provider_first_name TEXT,
  provider_middle_name TEXT,
  provider_org_name TEXT,
  credentials TEXT,
  gender TEXT,
  primary_taxonomy_code TEXT,
  primary_taxonomy_desc TEXT,
  specialty TEXT,
  practice_address_1 TEXT,
  practice_address_2 TEXT,
  practice_city TEXT,
  practice_state TEXT,
  practice_zip TEXT,
  practice_phone TEXT,
  practice_fax TEXT,
  mailing_address_1 TEXT,
  mailing_address_2 TEXT,
  mailing_city TEXT,
  mailing_state TEXT,
  mailing_zip TEXT,
  mailing_phone TEXT,
  enumeration_date DATE,
  last_updated DATE,
  deactivation_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
  search_name TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nppes_search_name ON nppes_providers (search_name);
CREATE INDEX IF NOT EXISTS idx_nppes_last_name ON nppes_providers (provider_last_name);
CREATE INDEX IF NOT EXISTS idx_nppes_org_name ON nppes_providers (provider_org_name);
CREATE INDEX IF NOT EXISTS idx_nppes_specialty ON nppes_providers (specialty);
CREATE INDEX IF NOT EXISTS idx_nppes_taxonomy ON nppes_providers (primary_taxonomy_code);
CREATE INDEX IF NOT EXISTS idx_nppes_practice_state_city ON nppes_providers (practice_state, practice_city);
CREATE INDEX IF NOT EXISTS idx_nppes_practice_zip ON nppes_providers (practice_zip);
CREATE INDEX IF NOT EXISTS idx_nppes_status ON nppes_providers (status);
CREATE INDEX IF NOT EXISTS idx_nppes_entity_type ON nppes_providers (entity_type);

ALTER TABLE nppes_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage nppes_providers" ON nppes_providers;
CREATE POLICY "Service role can manage nppes_providers"
  ON nppes_providers FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Import job progress tracking
CREATE TABLE IF NOT EXISTS nppes_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'registry_api',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  filter_state TEXT,
  filter_city TEXT,
  filter_zip TEXT,
  filter_specialty TEXT,
  total_fetched INT NOT NULL DEFAULT 0,
  total_upserted INT NOT NULL DEFAULT 0,
  error_message TEXT,
  started_by UUID,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

ALTER TABLE nppes_import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage nppes_import_jobs" ON nppes_import_jobs;
CREATE POLICY "Service role can manage nppes_import_jobs"
  ON nppes_import_jobs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Physical mail send log (Lob — wired when API key is provided)
CREATE TABLE IF NOT EXISTS provider_mail_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID,
  npi TEXT NOT NULL REFERENCES nppes_providers(npi) ON DELETE CASCADE,
  lob_id TEXT,
  mail_type TEXT NOT NULL CHECK (mail_type IN ('letter', 'postcard')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'rendered', 'in_transit', 'delivered', 'returned', 'failed', 'canceled')),
  address_source TEXT NOT NULL DEFAULT 'practice'
    CHECK (address_source IN ('practice', 'mailing')),
  to_address JSONB,
  template_label TEXT,
  lob_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_mail_npi ON provider_mail_sends (npi);
CREATE INDEX IF NOT EXISTS idx_provider_mail_status ON provider_mail_sends (status);
CREATE INDEX IF NOT EXISTS idx_provider_mail_created ON provider_mail_sends (created_at DESC);

ALTER TABLE provider_mail_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage provider_mail_sends" ON provider_mail_sends;
CREATE POLICY "Service role can manage provider_mail_sends"
  ON provider_mail_sends FOR ALL
  TO service_role USING (true) WITH CHECK (true);
