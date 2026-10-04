-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ideas table
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  record_version SMALLINT NOT NULL DEFAULT 1 CHECK (record_version IN (1, 2)),
  record_type TEXT CHECK (record_type IS NULL OR record_type IN ('question', 'observation', 'hypothesis', 'finding', 'proposal', 'other', 'not-sure')),
  sources TEXT,
  method TEXT,
  limitations TEXT,
  submitter_wallet_address TEXT NOT NULL,
  onchain_idea_id BIGINT,
  transaction_hash TEXT NOT NULL UNIQUE,
  block_number BIGINT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Responses table
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  response_type TEXT CHECK (response_type IN ('Support', 'Challenge', 'Evidence')),
  submitter_wallet_address TEXT NOT NULL,
  onchain_response_id BIGINT,
  transaction_hash TEXT NOT NULL UNIQUE,
  block_number BIGINT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_ideas_timestamp ON ideas(timestamp DESC);
CREATE INDEX idx_ideas_content_hash ON ideas(content_hash);
CREATE INDEX idx_ideas_submitter ON ideas(submitter_wallet_address);
CREATE INDEX idx_responses_idea_id ON responses(idea_id);
CREATE INDEX idx_responses_timestamp ON responses(timestamp DESC);
CREATE INDEX idx_responses_submitter ON responses(submitter_wallet_address);

-- Enable Row Level Security (RLS)
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow read access to everyone (public platform)
CREATE POLICY "Allow public read access to ideas" ON ideas FOR SELECT USING (true);
CREATE POLICY "Allow public read access to responses" ON responses FOR SELECT USING (true);

-- Writes use the server-only Supabase service-role key after Privy authentication.
-- No anon/authenticated INSERT, UPDATE, or DELETE policies are created here.

-- Comments explaining the schema
COMMENT ON TABLE ideas IS 'Stores idea content with on-chain hash verification';
COMMENT ON COLUMN ideas.content_hash IS 'Versioned SHA-256 hash of the record serialization, stored on-chain';
COMMENT ON COLUMN ideas.record_version IS 'Version of the canonical data serialized into content_hash; 1 is legacy text-only, 2 includes optional record context';
COMMENT ON COLUMN ideas.onchain_idea_id IS 'ID from the smart contract event';
COMMENT ON COLUMN ideas.transaction_hash IS 'Blockchain transaction hash';

COMMENT ON TABLE responses IS 'Stores responses linked to parent ideas';
COMMENT ON COLUMN responses.response_type IS 'Support, Challenge, or Evidence';
COMMENT ON COLUMN responses.onchain_response_id IS 'ID from the smart contract event';
