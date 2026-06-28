ALTER TABLE subscription_events
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
