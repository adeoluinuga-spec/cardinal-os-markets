-- Company Brain: soft-delete flag + vector similarity search for the
-- knowledge base. The `vector` extension and the embedding column already
-- exist (001 / 002); this adds the is_active flag and a matcher RPC.

ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Cosine-similarity search over a tenant's active knowledge entries.
-- SECURITY DEFINER (so it can read the embedding column) but always scoped
-- to the passed tenant id, mirroring the get_tenant_id() RLS pattern.
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(1536),
  p_tenant_id uuid,
  match_count int DEFAULT 5
) RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  similarity float
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE kb.tenant_id = p_tenant_id
    AND kb.is_active = true
    AND kb.embedding IS NOT NULL
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count
$$;
