-- Add explicit CEO and Logistics roles while keeping legacy Owner/Warehouse roles valid.
ALTER TABLE tenant_users
DROP CONSTRAINT IF EXISTS tenant_users_role_check;

ALTER TABLE tenant_users
ADD CONSTRAINT tenant_users_role_check CHECK (
  role IN (
    'ceo',
    'owner',
    'admin',
    'sales_agent',
    'warehouse',
    'logistics',
    'finance',
    'rider',
    'viewer'
  )
);

DROP POLICY IF EXISTS "activity_log_owner_admin" ON activity_log;
CREATE POLICY "activity_log_owner_admin" ON activity_log
  FOR ALL USING (
    tenant_id = get_tenant_id()
    AND get_tenant_role() IN ('ceo', 'owner', 'admin')
  );
