ALTER TABLE orders
ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf'
]
WHERE id = 'tenant-assets';
