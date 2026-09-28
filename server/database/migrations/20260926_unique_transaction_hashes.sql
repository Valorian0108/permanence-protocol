-- A blockchain transaction can create at most one idea or response archive row.
-- These constraints make archive recovery safe to retry without duplicate rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ideas_transaction_hash_unique
  ON ideas(transaction_hash);

CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_transaction_hash_unique
  ON responses(transaction_hash);
