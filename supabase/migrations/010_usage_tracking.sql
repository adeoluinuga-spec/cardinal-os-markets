-- Usage tracking for tier-based feature gating.
-- Tracks per-tenant, per-month counters for metered resources (AI queries,
-- orders). Hard-count resources (staff/customers/products) are counted
-- directly from their own tables, so they are not stored here.

CREATE TABLE IF NOT EXISTS usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  metric text NOT NULL CHECK (metric IN (
    'ai_queries', 'orders_this_month'
  )),
  count int DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, metric, period_start)
);

ALTER TABLE usage_tracking
  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usage_tracking_tenant" ON usage_tracking;
CREATE POLICY "usage_tracking_tenant"
  ON usage_tracking
  FOR ALL USING (tenant_id = get_tenant_id());

-- Helper function to increment usage for the current month.
CREATE OR REPLACE FUNCTION increment_usage(
  p_tenant_id uuid,
  p_metric text
) RETURNS void AS $$
BEGIN
  INSERT INTO usage_tracking
    (tenant_id, metric, count,
     period_start, period_end)
  VALUES (
    p_tenant_id, p_metric, 1,
    date_trunc('month', now())::date,
    (date_trunc('month', now())
      + interval '1 month - 1 day')::date
  )
  ON CONFLICT (tenant_id, metric, period_start)
  DO UPDATE SET
    count = usage_tracking.count + 1,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to get current month usage for a metric.
CREATE OR REPLACE FUNCTION get_usage(
  p_tenant_id uuid,
  p_metric text
) RETURNS int AS $$
  SELECT COALESCE(count, 0)
  FROM usage_tracking
  WHERE tenant_id = p_tenant_id
  AND metric = p_metric
  AND period_start = date_trunc('month', now())::date
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE INDEX IF NOT EXISTS usage_tracking_tenant_metric_period_idx
  ON usage_tracking(tenant_id, metric, period_start);
