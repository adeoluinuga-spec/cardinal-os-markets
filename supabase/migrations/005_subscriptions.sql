CREATE TABLE subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  event_type text NOT NULL,
  tier text,
  amount_naira numeric,
  paystack_reference text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_events
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscription_events_tenant"
  ON subscription_events
  FOR ALL USING (tenant_id = get_tenant_id());
