-- Storage bucket for tenant logos and future business assets.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'tenant-assets',
  'tenant-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "tenant_assets_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'tenant-assets');

CREATE POLICY "tenant_assets_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1] = 'tenants'
    AND EXISTS (
      SELECT 1
      FROM tenant_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND tenant_id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "tenant_assets_update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1] = 'tenants'
    AND EXISTS (
      SELECT 1
      FROM tenant_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND tenant_id::text = (storage.foldername(name))[2]
    )
  )
  WITH CHECK (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1] = 'tenants'
    AND EXISTS (
      SELECT 1
      FROM tenant_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND tenant_id::text = (storage.foldername(name))[2]
    )
  );
