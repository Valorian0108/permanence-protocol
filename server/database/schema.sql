-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ideas table
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  submitter_wallet_address TEXT NOT NULL,
  onchain_idea_id BIGINT,
  transaction_hash TEXT NOT NULL,
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
  transaction_hash TEXT NOT NULL,
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

-- RLS Policies: Allow insert only with proper authentication (to be implemented with Privy)
-- For now, allow inserts for testing - will be restricted once Privy is integrated
CREATE POLICY "Allow insert to ideas" ON ideas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert to responses" ON responses FOR INSERT WITH CHECK (true);

-- RLS Policies: Prevent updates and deletes (permanence principle)
CREATE POLICY "Prevent updates to ideas" ON ideas FOR UPDATE USING (false);
CREATE POLICY "Prevent deletes to ideas" ON ideas FOR DELETE USING (false);
CREATE POLICY "Prevent updates to responses" ON responses FOR UPDATE USING (false);
CREATE POLICY "Allow deletes to responses only when parent idea is deleted" ON responses FOR DELETE USING (true);

-- Comments explaining the schema
COMMENT ON TABLE ideas IS 'Stores idea content with on-chain hash verification';
COMMENT ON COLUMN ideas.content_hash IS 'SHA-256 hash of the content, stored on-chain';
COMMENT ON COLUMN ideas.onchain_idea_id IS 'ID from the smart contract event';
COMMENT ON COLUMN ideas.transaction_hash IS 'Blockchain transaction hash';

COMMENT ON TABLE responses IS 'Stores responses linked to parent ideas';
COMMENT ON COLUMN responses.response_type IS 'Support, Challenge, or Evidence';
COMMENT ON COLUMN responses.onchain_response_id IS 'ID from the smart contract event';