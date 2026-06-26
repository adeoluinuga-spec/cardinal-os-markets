ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS paystack_secret_key text,
  ADD COLUMN IF NOT EXISTS paystack_public_key text,
  ADD COLUMN IF NOT EXISTS paystack_webhook_secret text;
