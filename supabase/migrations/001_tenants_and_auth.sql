-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- TENANTS: every business on the platform
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  owner_id uuid REFERENCES auth.users,
  business_type text CHECK (business_type IN (
    'electronics','fashion','jewelry','beauty',
    'retail','food','building_materials',
    'auto_parts','general_trade','other'
  )),
  logo_url text,
  phone text,
  address text,
  city text DEFAULT 'Lagos',
  country text DEFAULT 'Nigeria',
  currency text DEFAULT 'NGN',
  market_association text,
  ai_persona_name text DEFAULT 'Cardinal',
  subscription_tier text DEFAULT 'trial'
    CHECK (subscription_tier IN (
      'trial','starter','growth','professional'
    )),
  subscription_status text DEFAULT 'trial'
    CHECK (subscription_status IN (
      'trial','active','suspended','cancelled'
    )),
  trial_ends_at timestamptz
    DEFAULT now() + interval '14 days',
  paystack_customer_code text,
  paystack_subscription_code text,
  onboarding_completed boolean DEFAULT false,
  onboarding_step int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- TENANT_USERS: staff within a tenant
CREATE TABLE tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  role text NOT NULL CHECK (role IN (
    'owner','admin','sales_agent',
    'warehouse','finance','rider','viewer'
  )),
  full_name text NOT NULL,
  phone text,
  is_active boolean DEFAULT true,
  invited_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Helper: get current user's tenant_id
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM tenant_users
  WHERE user_id = auth.uid()
  AND is_active = true
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_tenant_role()
RETURNS text AS $$
  SELECT role FROM tenant_users
  WHERE user_id = auth.uid()
  AND is_active = true
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS on tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_access" ON tenants
  FOR ALL USING (
    id = get_tenant_id()
    OR owner_id = auth.uid()
  );

-- RLS on tenant_users
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_users_access" ON tenant_users
  FOR ALL USING (
    tenant_id = get_tenant_id()
    OR user_id = auth.uid()
  );
