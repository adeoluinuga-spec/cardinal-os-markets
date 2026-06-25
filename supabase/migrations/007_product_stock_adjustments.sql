CREATE TABLE product_stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  product_id uuid REFERENCES products ON DELETE CASCADE NOT NULL,
  quantity int NOT NULL,
  direction text NOT NULL CHECK (direction IN ('add','remove')),
  reason text NOT NULL CHECK (reason IN ('restock','correction','damage','sale')),
  previous_quantity int NOT NULL,
  new_quantity int NOT NULL,
  adjusted_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_stock_adjustments_tenant"
  ON product_stock_adjustments
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE INDEX ON product_stock_adjustments(tenant_id, product_id);
CREATE INDEX ON product_stock_adjustments(tenant_id, created_at DESC);
