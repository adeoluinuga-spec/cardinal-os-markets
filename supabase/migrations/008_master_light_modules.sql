ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'quote','awaiting_payment','confirmed','production',
  'packaged','dispatched','delivered','cancelled'
));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_confirmed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_type text DEFAULT 'delivery'
  CHECK (fulfillment_type IN ('delivery','pickup'));

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','complete')),
  assigned_to uuid REFERENCES auth.users,
  created_by uuid REFERENCES auth.users,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium'
  CHECK (priority IN ('low','medium','high'));

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_tenant" ON tasks;
CREATE POLICY "tasks_tenant" ON tasks FOR ALL USING (tenant_id = get_tenant_id());
CREATE INDEX IF NOT EXISTS tasks_tenant_status_idx ON tasks(tenant_id, status);

CREATE TABLE IF NOT EXISTS incoming_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  product_id uuid REFERENCES products NOT NULL,
  product_name text NOT NULL,
  quantity int NOT NULL,
  supplier_name text,
  notes text,
  received_at date DEFAULT current_date,
  received_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE incoming_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "incoming_stock_tenant" ON incoming_stock;
CREATE POLICY "incoming_stock_tenant" ON incoming_stock FOR ALL USING (tenant_id = get_tenant_id());
CREATE INDEX IF NOT EXISTS incoming_stock_tenant_received_idx ON incoming_stock(tenant_id, received_at DESC);

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  old_values jsonb,
  new_values jsonb
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_log_owner_admin" ON activity_log;
CREATE POLICY "activity_log_owner_admin" ON activity_log
  FOR SELECT USING (
    tenant_id = get_tenant_id()
    AND get_tenant_role() IN ('owner','admin')
  );
CREATE INDEX IF NOT EXISTS activity_log_tenant_changed_idx ON activity_log(tenant_id, changed_at DESC);

CREATE OR REPLACE FUNCTION write_activity_log()
RETURNS trigger AS $$
DECLARE
  scoped_tenant uuid;
  record_uuid uuid;
BEGIN
  scoped_tenant := COALESCE(NEW.tenant_id, OLD.tenant_id);
  record_uuid := COALESCE(NEW.id, OLD.id);

  INSERT INTO activity_log (
    tenant_id, table_name, record_id, action, changed_by,
    old_values, new_values
  )
  VALUES (
    scoped_tenant, TG_TABLE_NAME, record_uuid, TG_OP, auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['orders','customers','products','payments','tenant_users','bank_accounts']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_activity_log ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER %I_activity_log AFTER UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION write_activity_log()',
      tbl, tbl
    );
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  order_id uuid REFERENCES orders NOT NULL,
  score int NOT NULL CHECK (score BETWEEN 1 AND 10),
  comment text,
  rated_at timestamptz DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ratings_tenant_read" ON ratings;
CREATE POLICY "ratings_tenant_read" ON ratings FOR SELECT USING (tenant_id = get_tenant_id());
CREATE INDEX IF NOT EXISTS ratings_tenant_rated_idx ON ratings(tenant_id, rated_at DESC);
