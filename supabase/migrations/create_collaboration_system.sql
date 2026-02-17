-- ============================================================
-- CASE-CENTRIC COLLABORATION SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Case Collaborators Table
CREATE TABLE IF NOT EXISTS public.case_collaborators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'co_owner', 'supporting', 'reviewer', 'observer')),
  permissions JSONB DEFAULT '{
    "can_edit": true,
    "can_message": true,
    "can_upload": true,
    "can_approve": false,
    "can_delete": false
  }'::jsonb,
  added_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, broker_id)
);

-- 2. Case Milestones Table
CREATE TABLE IF NOT EXISTS public.case_milestones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  sla_hours INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Case Timeline (activity stream)
CREATE TABLE IF NOT EXISTS public.case_timeline (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'comment', 'mention', 'milestone_created', 'milestone_completed',
    'document_uploaded', 'document_verified', 'status_change',
    'collaborator_added', 'collaborator_removed', 'system'
  )),
  content TEXT,
  mentions JSONB DEFAULT '[]'::jsonb,
  milestone_id UUID REFERENCES public.case_milestones(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_internal BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_case_collaborators_client ON public.case_collaborators(client_id);
CREATE INDEX idx_case_collaborators_broker ON public.case_collaborators(broker_id);
CREATE INDEX idx_case_collaborators_status ON public.case_collaborators(status);
CREATE INDEX idx_case_milestones_client ON public.case_milestones(client_id);
CREATE INDEX idx_case_milestones_owner ON public.case_milestones(owner_id);
CREATE INDEX idx_case_milestones_status ON public.case_milestones(status);
CREATE INDEX idx_case_timeline_client ON public.case_timeline(client_id);
CREATE INDEX idx_case_timeline_created ON public.case_timeline(created_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.case_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_timeline ENABLE ROW LEVEL SECURITY;

-- Case Collaborators: brokers see cases they own or collaborate on
CREATE POLICY "Brokers can view collaborators on their cases" ON public.case_collaborators
  FOR SELECT USING (
    broker_id = auth.uid() OR
    client_id IN (SELECT client_id FROM public.case_collaborators WHERE broker_id = auth.uid() AND status = 'active')
    OR client_id IN (SELECT id FROM public.clients WHERE broker_id = auth.uid())
  );

CREATE POLICY "Case owners can manage collaborators" ON public.case_collaborators
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE broker_id = auth.uid())
    OR client_id IN (SELECT client_id FROM public.case_collaborators WHERE broker_id = auth.uid() AND role IN ('owner', 'co_owner') AND status = 'active')
  );

CREATE POLICY "Case owners can update collaborators" ON public.case_collaborators
  FOR UPDATE USING (
    client_id IN (SELECT id FROM public.clients WHERE broker_id = auth.uid())
    OR client_id IN (SELECT client_id FROM public.case_collaborators WHERE broker_id = auth.uid() AND role IN ('owner', 'co_owner') AND status = 'active')
  );

CREATE POLICY "Case owners can delete collaborators" ON public.case_collaborators
  FOR DELETE USING (
    client_id IN (SELECT id FROM public.clients WHERE broker_id = auth.uid())
  );

-- Admins full access to collaborators
CREATE POLICY "Admins can manage all collaborators" ON public.case_collaborators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Case Milestones: visible to owner and collaborators
CREATE POLICY "Brokers can view milestones on their cases" ON public.case_milestones
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE broker_id = auth.uid())
    OR client_id IN (SELECT client_id FROM public.case_collaborators WHERE broker_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Brokers can insert milestones on their cases" ON public.case_milestones
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE broker_id = auth.uid())
    OR client_id IN (SELECT client_id FROM public.case_collaborators WHERE broker_id = auth.uid() AND role IN ('owner', 'co_owner') AND status = 'active')
  );

CREATE POLICY "Brokers can update milestones on their cases" ON public.case_milestones
  FOR UPDATE USING (
    client_id IN (SELECT id FROM public.clients WHERE broker_id = auth.uid())
    OR client_id IN (SELECT client_id FROM public.case_collaborators WHERE broker_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Brokers can delete milestones on their cases" ON public.case_milestones
  FOR DELETE USING (
    client_id IN (SELECT id FROM public.clients WHERE broker_id = auth.uid())
    OR client_id IN (SELECT client_id FROM public.case_collaborators WHERE broker_id = auth.uid() AND role IN ('owner', 'co_owner') AND status = 'active')
  );

CREATE POLICY "Admins can manage all milestones" ON public.case_milestones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Case Timeline: visible to owner and collaborators
CREATE POLICY "Brokers can view timeline on their cases" ON public.case_timeline
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE broker_id = auth.uid())
    OR client_id IN (SELECT client_id FROM public.case_collaborators WHERE broker_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Brokers can add timeline entries on their cases" ON public.case_timeline
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE broker_id = auth.uid())
    OR client_id IN (SELECT client_id FROM public.case_collaborators WHERE broker_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Admins can manage all timeline" ON public.case_timeline
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Auto-create owner collaborator when a client is created
-- ============================================================
CREATE OR REPLACE FUNCTION auto_add_case_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.case_collaborators (client_id, broker_id, role, permissions, added_by, status, accepted_at)
  VALUES (
    NEW.id,
    NEW.broker_id,
    'owner',
    '{"can_edit": true, "can_message": true, "can_upload": true, "can_approve": true, "can_delete": true}'::jsonb,
    NEW.broker_id,
    'active',
    NOW()
  )
  ON CONFLICT (client_id, broker_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_add_case_owner
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_case_owner();

-- ============================================================
-- Helper: Get team feed for a broker (cases with updates)
-- ============================================================
CREATE OR REPLACE FUNCTION get_team_feed(broker_uuid UUID, feed_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  timeline_id UUID,
  client_id UUID,
  client_name TEXT,
  author_id UUID,
  author_name TEXT,
  type TEXT,
  content TEXT,
  mentions JSONB,
  milestone_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS timeline_id,
    t.client_id,
    c.name AS client_name,
    t.author_id,
    p.full_name AS author_name,
    t.type,
    t.content,
    t.mentions,
    t.milestone_id,
    t.metadata,
    t.created_at
  FROM public.case_timeline t
  JOIN public.clients c ON c.id = t.client_id
  LEFT JOIN public.profiles p ON p.id = t.author_id
  WHERE t.client_id IN (
    -- Cases the broker owns
    SELECT cl.id FROM public.clients cl WHERE cl.broker_id = broker_uuid
    UNION
    -- Cases the broker collaborates on
    SELECT cc.client_id FROM public.case_collaborators cc WHERE cc.broker_id = broker_uuid AND cc.status = 'active'
  )
  ORDER BY t.created_at DESC
  LIMIT feed_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Helper: Get collaboration stats for dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION get_collaboration_stats(broker_uuid UUID)
RETURNS TABLE (
  total_collaborations BIGINT,
  pending_invites BIGINT,
  milestones_due_today BIGINT,
  blocked_milestones BIGINT,
  unread_mentions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.case_collaborators WHERE broker_id = broker_uuid AND status = 'active' AND role != 'owner')::BIGINT AS total_collaborations,
    (SELECT COUNT(*) FROM public.case_collaborators WHERE broker_id = broker_uuid AND status = 'pending')::BIGINT AS pending_invites,
    (SELECT COUNT(*) FROM public.case_milestones m WHERE m.owner_id = broker_uuid AND m.status != 'completed' AND m.status != 'cancelled' AND m.due_date IS NOT NULL AND m.due_date::date = CURRENT_DATE)::BIGINT AS milestones_due_today,
    (SELECT COUNT(*) FROM public.case_milestones m
     WHERE m.status = 'blocked'
     AND (m.owner_id = broker_uuid OR m.client_id IN (SELECT client_id FROM public.case_collaborators WHERE broker_id = broker_uuid AND status = 'active'))
    )::BIGINT AS blocked_milestones,
    (SELECT COUNT(*) FROM public.case_timeline t
     WHERE t.mentions @> ('[{"user_id":"' || broker_uuid::text || '"}]')::jsonb
     AND t.created_at > NOW() - INTERVAL '7 days'
    )::BIGINT AS unread_mentions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
