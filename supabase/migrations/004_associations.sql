-- ASSOCIATIONS: market associations
CREATE TABLE associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  market_name text,
  city text DEFAULT 'Lagos',
  logo_url text,
  is_active boolean DEFAULT true,
  show_public_stats boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ASSOCIATION_MEMBERS: which tenants belong
CREATE TABLE association_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid REFERENCES associations NOT NULL,
  tenant_id uuid REFERENCES tenants NOT NULL,
  member_number text,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(association_id, tenant_id)
);

-- Seed the first two associations
INSERT INTO associations (name, slug, market_name, city)
VALUES
  ('Alaba International Market',
   'alaba-international',
   'Alaba International Market', 'Lagos'),
  ('Lagos Trade Fair Complex',
   'trade-fair-lagos',
   'Lagos International Trade Fair', 'Lagos');

-- Public read access on associations
ALTER TABLE associations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "associations_public_read"
  ON associations FOR SELECT USING (true);

ALTER TABLE association_members
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "association_members_tenant"
  ON association_members
  FOR ALL USING (tenant_id = get_tenant_id());
