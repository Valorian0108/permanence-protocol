-- Store public pseudonyms separately from private wallet identifiers.
CREATE TABLE IF NOT EXISTS public.contributor_profiles (
  wallet_address TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  nickname_customized BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contributor_profiles_nickname_length CHECK (char_length(nickname) BETWEEN 3 AND 24),
  CONSTRAINT contributor_profiles_nickname_characters CHECK (nickname ~ '^[A-Za-z0-9 _-]+$')
);

CREATE UNIQUE INDEX IF NOT EXISTS contributor_profiles_nickname_lower_unique
  ON public.contributor_profiles (lower(nickname));

ALTER TABLE public.contributor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Public clients must use sanitized archive API routes; never expose wallet columns through PostgREST.
DROP POLICY IF EXISTS "Allow public read access to ideas" ON public.ideas;
DROP POLICY IF EXISTS "Allow public read access to responses" ON public.responses;
DROP POLICY IF EXISTS "Public read access to ideas" ON public.ideas;
DROP POLICY IF EXISTS "Public read access to responses" ON public.responses;
DROP POLICY IF EXISTS "Public profiles are readable" ON public.contributor_profiles;

REVOKE ALL ON public.contributor_profiles FROM anon, authenticated;
REVOKE ALL ON public.contributor_profiles FROM PUBLIC;
REVOKE SELECT ON public.ideas, public.responses FROM anon, authenticated;
REVOKE SELECT ON public.ideas, public.responses FROM PUBLIC;
GRANT ALL ON public.contributor_profiles TO service_role;

COMMENT ON TABLE public.contributor_profiles IS 'Internal mapping from wallet identifiers to contributor-chosen public nicknames; do not expose wallet_address through public APIs.';
COMMENT ON COLUMN public.contributor_profiles.nickname_customized IS 'False for generated placeholders, true after the contributor explicitly chooses or updates a nickname.';
