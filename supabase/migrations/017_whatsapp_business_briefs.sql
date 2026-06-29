ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS daily_brief_enabled boolean DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS daily_brief_time text DEFAULT '18:00';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS daily_brief_frequency text DEFAULT 'daily'
  CHECK (daily_brief_frequency IN ('daily', 'weekly'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS weekly_brief_day int DEFAULT 1
  CHECK (weekly_brief_day BETWEEN 0 AND 6);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_opted_in boolean DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_opted_in_at timestamptz;

CREATE TABLE IF NOT EXISTS daily_brief_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  sent_for_date date NOT NULL,
  channel text DEFAULT 'whatsapp',
  message_content text,
  status text DEFAULT 'sent',
  termii_message_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, sent_for_date, channel)
);

ALTER TABLE daily_brief_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_brief_log_tenant_read" ON daily_brief_log;
CREATE POLICY "daily_brief_log_tenant_read" ON daily_brief_log
  FOR SELECT USING (tenant_id = get_tenant_id());
