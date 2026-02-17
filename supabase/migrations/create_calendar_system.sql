-- Calendar Integration Schema for BrocaAI
-- Migration: create_calendar_system.sql

-- Calendar Events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Basic event info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Date/Time
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Event type: meeting, call, deadline, reminder, milestone
  event_type VARCHAR(50) NOT NULL DEFAULT 'meeting',
  
  -- Links
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES case_milestones(id) ON DELETE SET NULL,
  video_link TEXT,
  location TEXT,
  
  -- Attendees: array of { email, name?, status: 'pending'|'accepted'|'declined' }
  attendees JSONB DEFAULT '[]',
  
  -- Reminders: array of { type: 'email'|'browser', minutes_before: number }
  reminders JSONB DEFAULT '[]',
  
  -- Recurrence (for future use)
  recurrence_rule TEXT,
  recurrence_end TIMESTAMPTZ,
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  -- External calendar sync
  google_event_id VARCHAR(255),
  outlook_event_id VARCHAR(255),
  external_sync_enabled BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, cancelled
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  color VARCHAR(20),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_broker ON calendar_events(broker_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client ON calendar_events(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_milestone ON calendar_events(milestone_id) WHERE milestone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);

-- Compound index for date range queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_broker_range 
  ON calendar_events(broker_id, start_time, end_time);

-- Event reminders sent tracking (to avoid duplicate sends)
CREATE TABLE IF NOT EXISTS calendar_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL, -- email, browser
  minutes_before INT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent', -- sent, failed
  error_message TEXT,
  UNIQUE(event_id, reminder_type, minutes_before)
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_event ON calendar_reminder_logs(event_id);

-- RLS Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_reminder_logs ENABLE ROW LEVEL SECURITY;

-- Brokers can only see their own events
CREATE POLICY "Brokers can view own events"
  ON calendar_events FOR SELECT
  USING (broker_id = auth.uid());

CREATE POLICY "Brokers can insert own events"
  ON calendar_events FOR INSERT
  WITH CHECK (broker_id = auth.uid());

CREATE POLICY "Brokers can update own events"
  ON calendar_events FOR UPDATE
  USING (broker_id = auth.uid());

CREATE POLICY "Brokers can delete own events"
  ON calendar_events FOR DELETE
  USING (broker_id = auth.uid());

-- Reminder logs follow event ownership
CREATE POLICY "View reminder logs for own events"
  ON calendar_reminder_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events 
      WHERE calendar_events.id = calendar_reminder_logs.event_id 
      AND calendar_events.broker_id = auth.uid()
    )
  );

CREATE POLICY "Insert reminder logs for own events"
  ON calendar_reminder_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_events 
      WHERE calendar_events.id = calendar_reminder_logs.event_id 
      AND calendar_events.broker_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_event_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS calendar_events_updated_at ON calendar_events;
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_event_timestamp();

-- Function to create calendar event from milestone
CREATE OR REPLACE FUNCTION create_event_from_milestone(
  p_milestone_id UUID,
  p_broker_id UUID
) RETURNS UUID AS $$
DECLARE
  v_milestone RECORD;
  v_event_id UUID;
  v_client_name TEXT;
BEGIN
  -- Get milestone details
  SELECT m.*, c.name as client_name
  INTO v_milestone
  FROM case_milestones m
  JOIN clients c ON c.id = m.client_id
  WHERE m.id = p_milestone_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found';
  END IF;
  
  IF v_milestone.due_date IS NULL THEN
    RAISE EXCEPTION 'Milestone has no due date';
  END IF;
  
  -- Check if event already exists for this milestone
  SELECT id INTO v_event_id
  FROM calendar_events
  WHERE milestone_id = p_milestone_id AND broker_id = p_broker_id;
  
  IF FOUND THEN
    -- Update existing event
    UPDATE calendar_events SET
      title = 'Deadline: ' || v_milestone.title,
      start_time = v_milestone.due_date::timestamptz,
      end_time = v_milestone.due_date::timestamptz + interval '30 minutes',
      status = CASE WHEN v_milestone.status = 'completed' THEN 'completed' ELSE 'scheduled' END,
      updated_at = NOW()
    WHERE id = v_event_id;
    
    RETURN v_event_id;
  END IF;
  
  -- Create new event
  INSERT INTO calendar_events (
    broker_id,
    title,
    description,
    start_time,
    end_time,
    event_type,
    client_id,
    milestone_id,
    reminders,
    status
  ) VALUES (
    p_broker_id,
    'Deadline: ' || v_milestone.title,
    'Milestone deadline for ' || v_milestone.client_name,
    v_milestone.due_date::timestamptz,
    v_milestone.due_date::timestamptz + interval '30 minutes',
    'deadline',
    v_milestone.client_id,
    p_milestone_id,
    '[{"type": "email", "minutes_before": 1440}, {"type": "email", "minutes_before": 60}]'::jsonb,
    CASE WHEN v_milestone.status = 'completed' THEN 'completed' ELSE 'scheduled' END
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_event_from_milestone TO authenticated;

-- Function to get upcoming events
CREATE OR REPLACE FUNCTION get_upcoming_events(
  p_broker_id UUID,
  p_limit INT DEFAULT 10
) RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  event_type VARCHAR(50),
  client_id UUID,
  client_name TEXT,
  video_link TEXT,
  status VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.start_time,
    e.end_time,
    e.event_type,
    e.client_id,
    c.name as client_name,
    e.video_link,
    e.status
  FROM calendar_events e
  LEFT JOIN clients c ON c.id = e.client_id
  WHERE e.broker_id = p_broker_id
    AND e.start_time >= NOW()
    AND e.status = 'scheduled'
  ORDER BY e.start_time ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_upcoming_events TO authenticated;

-- Comments for documentation
COMMENT ON TABLE calendar_events IS 'Stores all calendar events for brokers including meetings, calls, deadlines, and reminders';
COMMENT ON COLUMN calendar_events.event_type IS 'Type of event: meeting, call, deadline, reminder, milestone';
COMMENT ON COLUMN calendar_events.attendees IS 'JSON array of attendees with email, name, and status';
COMMENT ON COLUMN calendar_events.reminders IS 'JSON array of reminder configs with type and minutes_before';
