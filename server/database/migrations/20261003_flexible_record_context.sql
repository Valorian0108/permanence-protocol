-- Optional context is attached only to top-level records. Existing rows remain
-- version 1 and continue to verify against their original text-only SHA-256.
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS record_version SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS record_type TEXT,
  ADD COLUMN IF NOT EXISTS sources TEXT,
  ADD COLUMN IF NOT EXISTS method TEXT,
  ADD COLUMN IF NOT EXISTS limitations TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ideas_record_version_check'
  ) THEN
    ALTER TABLE ideas ADD CONSTRAINT ideas_record_version_check CHECK (record_version IN (1, 2));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ideas_record_type_check'
  ) THEN
    ALTER TABLE ideas ADD CONSTRAINT ideas_record_type_check CHECK (
      record_type IS NULL OR record_type IN ('question', 'observation', 'hypothesis', 'finding', 'proposal', 'other', 'not-sure')
    );
  END IF;
END $$;

COMMENT ON COLUMN ideas.record_version IS 'Version of the canonical data serialized into content_hash; 1 is legacy text-only, 2 includes optional record context.';
COMMENT ON COLUMN ideas.record_type IS 'Optional contributor-selected label for a top-level record; does not change response categories.';
COMMENT ON COLUMN ideas.sources IS 'Optional sources or evidence supplied with a top-level record.';
COMMENT ON COLUMN ideas.method IS 'Optional explanation of how a finding or observation was reached.';
COMMENT ON COLUMN ideas.limitations IS 'Optional caveats, limitations, or open questions supplied with a record.';
