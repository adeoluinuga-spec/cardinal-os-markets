ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';
