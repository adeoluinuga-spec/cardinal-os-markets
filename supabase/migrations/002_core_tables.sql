-- PRODUCTS
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  name text NOT NULL,
  sku text,
  category text,
  description text,
  unit_price numeric DEFAULT 0,
  wholesale_price numeric DEFAULT 0,
  cost_price numeric DEFAULT 0,
  stock_quantity int DEFAULT 0,
  reorder_point int DEFAULT 5,
  unit text DEFAULT 'unit',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, sku)
);

-- CUSTOMERS
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  address text,
  city text,
  customer_type text DEFAULT 'retail'
    CHECK (customer_type IN (
      'retail','wholesale','distributor'
    )),
  health_score int DEFAULT 50,
  lifetime_value numeric DEFAULT 0,
  total_orders int DEFAULT 0,
  last_order_at timestamptz,
  notes text,
  assigned_to uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now()
);

-- ORDERS
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  order_number text NOT NULL,
  customer_id uuid REFERENCES customers,
  customer_name text NOT NULL,
  customer_phone text,
  channel text DEFAULT 'manual' CHECK (channel IN (
    'whatsapp','walk_in','phone','website',
    'instagram','manual','referral'
  )),
  status text DEFAULT 'quote' CHECK (status IN (
    'quote','awaiting_payment','confirmed',
    'packaged','dispatched','delivered','cancelled'
  )),
  payment_status text DEFAULT 'unpaid'
    CHECK (payment_status IN (
      'unpaid','partial','paid'
    )),
  subtotal numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  balance numeric DEFAULT 0,
  delivery_address text,
  notes text,
  expected_delivery_at date,
  tracking_token text UNIQUE
    DEFAULT gen_random_uuid()::text,
  assigned_to uuid REFERENCES auth.users,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, order_number)
);

-- ORDER_ITEMS
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  order_id uuid REFERENCES orders
    ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products,
  product_name text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL
);

-- PAYMENTS
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  reference text NOT NULL,
  order_id uuid REFERENCES orders,
  amount numeric NOT NULL,
  channel text CHECK (channel IN (
    'paystack','bank_transfer','cash','pos'
  )),
  payer_name text,
  bank_name text,
  proof_url text,
  proof_hash text,
  status text DEFAULT 'pending' CHECK (status IN (
    'pending','verified','rejected','assigned'
  )),
  verified_by uuid REFERENCES auth.users,
  verified_at timestamptz,
  submitted_by uuid REFERENCES auth.users,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, reference)
);

-- DELIVERIES
CREATE TABLE deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  order_id uuid REFERENCES orders NOT NULL,
  rider_name text,
  rider_phone text,
  otp_code text,
  otp_verified boolean DEFAULT false,
  otp_attempts int DEFAULT 0,
  proof_photo_url text,
  status text DEFAULT 'pending' CHECK (status IN (
    'pending','assigned','in_transit',
    'delivered','failed'
  )),
  dispatched_at timestamptz,
  delivered_at timestamptz
);

-- BANK_ACCOUNTS (per tenant)
CREATE TABLE bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- KNOWLEDGE_BASE
CREATE TABLE knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general',
  embedding vector(1536),
  created_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now()
);

-- AI_CONVERSATIONS
CREATE TABLE ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants NOT NULL,
  user_id uuid REFERENCES auth.users,
  session_id text,
  role text CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
