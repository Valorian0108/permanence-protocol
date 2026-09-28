-- Enforce a shared per-wallet limit across serverless instances.
CREATE TABLE IF NOT EXISTS public.post_rate_limits (
  wallet_address TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (wallet_address)
);

ALTER TABLE public.post_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.post_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.post_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_post_rate_limit(
  p_wallet_address TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (allowed BOOLEAN, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_window TIMESTAMPTZ := date_trunc('hour', now());
  updated_count INTEGER;
BEGIN
  IF p_wallet_address IS NULL OR length(trim(p_wallet_address)) = 0 THEN
    RAISE EXCEPTION 'wallet address is required';
  END IF;
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'limit must be between 1 and 100';
  END IF;

  INSERT INTO public.post_rate_limits AS limits (wallet_address, window_start, request_count)
  VALUES (lower(trim(p_wallet_address)), current_window, 1)
  ON CONFLICT (wallet_address)
  DO UPDATE SET
    request_count = CASE
      WHEN limits.window_start = EXCLUDED.window_start THEN LEAST(limits.request_count + 1, p_limit + 1)
      ELSE 1
    END,
    window_start = EXCLUDED.window_start
  RETURNING request_count INTO updated_count;

  RETURN QUERY SELECT
    updated_count <= p_limit,
    CASE WHEN updated_count <= p_limit THEN 0
      ELSE GREATEST(1, CEIL(EXTRACT(EPOCH FROM (current_window + INTERVAL '1 hour' - now())))::INTEGER)
    END;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_post_rate_limit(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_post_rate_limit(TEXT, INTEGER) TO service_role;
