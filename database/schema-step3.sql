-- Step 3: Create Responses table
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