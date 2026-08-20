-- OmniClause database schema
-- Run this against a fresh PostgreSQL database (Supabase or self-hosted).
-- Requires the pgvector extension available on the server.

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- users
-- Base identity + role for RBAC. JWT verification / auth middleware
-- is out of scope for this sprint (see CONSTRAINTS) -- this table only
-- establishes the role a user carries once authenticated.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  user_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(50) NOT NULL
                 CHECK (role IN ('admin', 'manager', 'operator')),
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- documents
-- One row per ingested contract/document. `required_role` drives the
-- RLS policy below (RBAC-enforced retrieval). `embedding` is sized
-- for common embedding models (e.g. OpenAI text-embedding-3-small);
-- revisit the dimension if a different model is chosen later.
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  document_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content        TEXT NOT NULL,
  metadata       JSONB DEFAULT '{}'::jsonb,
  required_role  VARCHAR(50) NOT NULL
                 CHECK (required_role IN ('admin', 'manager', 'operator', 'public')),
  embedding      VECTOR(1536),
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HNSW index for approximate nearest-neighbour semantic search.
-- m / ef_construction tuned per spec: higher recall at a modest
-- build-time/memory cost, appropriate for this product's data sizes.
CREATE INDEX IF NOT EXISTS idx_documents_embedding
  ON documents USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================
-- agent_logs
-- Audit trail of AI agent interactions: the prompt, the response,
-- which documents were retrieved to ground it, and token cost.
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_logs (
  log_id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID REFERENCES users(user_id) ON DELETE CASCADE,
  session_id              UUID NOT NULL,
  user_prompt             TEXT NOT NULL,
  agent_response          TEXT NOT NULL,
  retrieved_document_ids  UUID[] DEFAULT '{}',
  tokens_used             INTEGER,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Row-Level Security
-- ============================================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Permits SELECT when a document is public, or when the caller's JWT
-- role (set by Supabase/PostgREST as the `request.jwt.role` GUC)
-- matches the document's required_role. `current_setting(..., true)`
-- returns NULL instead of erroring when unset, so this fails closed
-- until an authenticated request actually sets that claim.
--
-- IMPORTANT: Row-Level Security is enforced for ordinary database
-- roles, but a superuser (e.g. the default `postgres` role) always
-- bypasses RLS regardless of policy. The application's connection pool
-- must run as a non-superuser role for this policy to have any real
-- effect -- that role, plus the JWT verification middleware that
-- actually sets `request.jwt.role`, is explicitly out of scope for
-- this sprint.
CREATE POLICY document_access_policy ON documents
  FOR SELECT
  USING (
    required_role = 'public'
    OR required_role = current_setting('request.jwt.role', true)
  );
