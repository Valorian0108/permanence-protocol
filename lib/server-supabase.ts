import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getServerSupabase() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server credentials are not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function consumePostRateLimit(walletAddress: string, limit = 5) {
  const { data, error } = await getServerSupabase().rpc('consume_post_rate_limit', {
    p_wallet_address: walletAddress.toLowerCase(),
    p_limit: limit,
  });

  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result.allowed !== 'boolean') {
    throw new Error('Post rate-limit function returned an invalid result');
  }

  return {
    allowed: result.allowed,
    retryAfterSeconds: Number(result.retry_after_seconds) || 0,
  };
}

export async function saveIdea(ideaData: {
  content_hash: string;
  content: string;
  submitter_wallet_address: string;
  onchain_idea_id: number;
  transaction_hash: string;
  block_number: number;
}) {
  const { data, error } = await getServerSupabase()
    .from('ideas')
    .insert(ideaData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getIdeaByTransactionHash(transactionHash: string) {
  const { data, error } = await getServerSupabase()
    .from('ideas')
    .select('content_hash, content, submitter_wallet_address, onchain_idea_id, transaction_hash, block_number')
    .eq('transaction_hash', transactionHash)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveResponse(responseData: {
  idea_id: string;
  content_hash: string;
  content: string;
  response_type: string;
  submitter_wallet_address: string;
  onchain_response_id: number;
  transaction_hash: string;
  block_number: number;
}) {
  const { data, error } = await getServerSupabase()
    .from('responses')
    .insert(responseData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getResponseByTransactionHash(transactionHash: string) {
  const { data, error } = await getServerSupabase()
    .from('responses')
    .select('idea_id, content_hash, content, response_type, submitter_wallet_address, onchain_response_id, transaction_hash, block_number')
    .eq('transaction_hash', transactionHash)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getIdeaForResponse(id: string) {
  const { data, error } = await getServerSupabase()
    .from('ideas')
    .select('id, onchain_idea_id')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}
