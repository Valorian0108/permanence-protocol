-- Step 4: Create indexes
CREATE INDEX idx_ideas_timestamp ON ideas(timestamp DESC);
CREATE INDEX idx_ideas_content_hash ON ideas(content_hash);
CREATE INDEX idx_ideas_submitter ON ideas(submitter_wallet_address);
CREATE INDEX idx_responses_idea_id ON responses(idea_id);
CREATE INDEX idx_responses_timestamp ON responses(timestamp DESC);
CREATE INDEX idx_responses_submitter ON responses(submitter_wallet_address);