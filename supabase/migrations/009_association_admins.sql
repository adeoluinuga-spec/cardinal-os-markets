CREATE TABLE IF NOT EXISTS association_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid REFERENCES associations NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(association_id, user_id)
);

ALTER TABLE association_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "association_admins_own_read" ON association_admins;
CREATE POLICY "association_admins_own_read"
  ON association_admins
  FOR SELECT USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS association_admins_assoc_user_idx
  ON association_admins(association_id, user_id);
