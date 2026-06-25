-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Standard tenant isolation policy for each table
CREATE POLICY "products_tenant" ON products
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "customers_tenant" ON customers
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "orders_tenant" ON orders
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "order_items_tenant" ON order_items
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "payments_tenant" ON payments
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "deliveries_tenant" ON deliveries
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "bank_accounts_tenant" ON bank_accounts
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "knowledge_base_tenant" ON knowledge_base
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "ai_conversations_tenant"
  ON ai_conversations
  FOR ALL USING (tenant_id = get_tenant_id());

-- Indexes for performance
CREATE INDEX ON products(tenant_id);
CREATE INDEX ON products(tenant_id, is_active);
CREATE INDEX ON customers(tenant_id);
CREATE INDEX ON customers(tenant_id, customer_type);
CREATE INDEX ON orders(tenant_id, status);
CREATE INDEX ON orders(tenant_id, created_at DESC);
CREATE INDEX ON orders(tracking_token);
CREATE INDEX ON payments(tenant_id, reference);
CREATE INDEX ON payments(tenant_id, status);
CREATE INDEX ON deliveries(tenant_id);
CREATE INDEX ON knowledge_base(tenant_id);
