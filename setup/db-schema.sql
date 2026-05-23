-- =============================================================
-- AI Facebook Assistant — Supabase Database Schema
-- =============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- =============================================================
-- User Profiles
-- =============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  psid TEXT UNIQUE NOT NULL,
  first_name TEXT DEFAULT 'User',
  last_name TEXT DEFAULT '',
  profile_pic TEXT DEFAULT '',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_psid ON user_profiles(psid);

-- =============================================================
-- Chat History
-- =============================================================
CREATE TABLE IF NOT EXISTS chat_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  psid TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_history_psid ON chat_history(psid);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);

-- =============================================================
-- Long-Term Memory
-- =============================================================
CREATE TABLE IF NOT EXISTS long_term_memory (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  psid TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT DEFAULT 'conversation',
  importance REAL DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_long_term_memory_psid ON long_term_memory(psid);

-- =============================================================
-- Memory Embeddings (Vector Search)
-- =============================================================
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  psid TEXT NOT NULL,
  message_id BIGINT,
  content TEXT NOT NULL,
  embedding VECTOR(1024),
  type TEXT DEFAULT 'short_term' CHECK (type IN ('short_term', 'long_term', 'semantic')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_embeddings_psid ON memory_embeddings(psid);
CREATE INDEX idx_memory_embeddings_vector ON memory_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =============================================================
-- RPC: Semantic Memory Search
-- =============================================================
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding VECTOR(1024),
  match_count INT DEFAULT 5,
  p_psid TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.id,
    me.content,
    me.type,
    1 - (me.embedding <=> query_embedding) AS similarity
  FROM memory_embeddings me
  WHERE (p_psid IS NULL OR me.psid = p_psid)
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =============================================================
-- Admin Audit Log
-- =============================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  psid TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_log_psid ON admin_audit_log(psid);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- =============================================================
-- Rate Limiting
-- =============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  psid TEXT NOT NULL,
  request_count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (psid)
);