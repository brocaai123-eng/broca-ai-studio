-- =====================================================
-- DOCUMENT REQUESTS TABLE
-- Stores document requests sent by brokers to clients
-- with secure upload tokens for public access
-- =====================================================

CREATE TABLE IF NOT EXISTS public.document_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  upload_token TEXT UNIQUE NOT NULL,
  message TEXT,
  requested_documents JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  documents_count INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookups (public access)
CREATE INDEX IF NOT EXISTS idx_document_requests_upload_token ON public.document_requests(upload_token);

-- Index for client lookups
CREATE INDEX IF NOT EXISTS idx_document_requests_client_id ON public.document_requests(client_id);

-- Enable RLS
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- Brokers can manage their own document requests
CREATE POLICY "Brokers can manage own document requests" ON public.document_requests
  FOR ALL USING (auth.uid() = broker_id);

-- Public access by upload token (for the upload page - uses service role, so RLS bypassed)
-- No additional policy needed since the upload API uses supabaseAdmin (service role)
