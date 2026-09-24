-- Step 2: Create Ideas table
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