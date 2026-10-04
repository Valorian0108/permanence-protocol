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

export async function getContributorNickname(walletAddress: string) {
  const { data, error } = await getServerSupabase()
    .from('contributor_profiles')
    .select('nickname, nickname_customized')
    .eq('wallet_address', walletAddress.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data as { nickname: string; nickname_customized: boolean } | null;
}

export async function contributorHasNickname(walletAddress: string) {
  const profile = await getContributorNickname(walletAddress);
  return Boolean(profile?.nickname_customized);
}

export async function saveContributorNickname(walletAddress: string, nickname: string) {
  const { data, error } = await getServerSupabase()
    .from('contributor_profiles')
    .upsert({ wallet_address: walletAddress.toLowerCase(), nickname, nickname_customized: true, updated_at: new Date().toISOString() }, { onConflict: 'wallet_address' })
    .select('nickname, nickname_customized')
    .single();

  if (error) throw error;
  return data as { nickname: string; nickname_customized: boolean };
}

export async function getPublicIdeas({ page, pageSize, query }: { page: number; pageSize: number; query: string }) {
  let request = getServerSupabase()
    .from('ideas')
    .select('id, content_hash, content, record_version, record_type, sources, method, limitations, submitter_wallet_address, onchain_idea_id, transaction_hash, block_number, timestamp, responses(count)', { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (query) request = request.ilike('content', `%${query}%`);
  const { data, error, count } = await request;
  if (error) throw error;

  const wallets = [...new Set((data ?? []).map((idea) => String(idea.submitter_wallet_address).toLowerCase()))];
  const { data: profiles, error: profileError } = wallets.length
    ? await getServerSupabase().from('contributor_profiles').select('wallet_address, nickname').in('wallet_address', wallets)
    : { data: [], error: null };
  if (profileError) throw profileError;
  const nicknameByWallet = new Map((profiles ?? []).map((profile) => [profile.wallet_address, profile.nickname]));

  return {
    ideas: (data ?? []).map((idea) => ({
      id: idea.id,
      content_hash: idea.content_hash,
      content: idea.content,
      record_version: idea.record_version,
      record_type: idea.record_type,
      sources: idea.sources,
      method: idea.method,
      limitations: idea.limitations,
      submitter_nickname: nicknameByWallet.get(String(idea.submitter_wallet_address).toLowerCase()) ?? 'Contributor',
      onchain_idea_id: idea.onchain_idea_id,
      transaction_hash: idea.transaction_hash,
      block_number: idea.block_number,
      timestamp: idea.timestamp,
      response_count: Array.isArray(idea.responses) ? Number(idea.responses[0]?.count ?? 0) : 0,
    })),
    total: count ?? 0,
  };
}

export async function getPublicResponses(ideaId: string) {
  const { data, error } = await getServerSupabase()
    .from('responses')
    .select('id, idea_id, content_hash, content, response_type, submitter_wallet_address, onchain_response_id, transaction_hash, block_number, timestamp')
    .eq('idea_id', ideaId)
    .order('timestamp', { ascending: true });

  if (error) throw error;
  const wallets = [...new Set((data ?? []).map((response) => String(response.submitter_wallet_address).toLowerCase()))];
  const { data: profiles, error: profileError } = wallets.length
    ? await getServerSupabase().from('contributor_profiles').select('wallet_address, nickname').in('wallet_address', wallets)
    : { data: [], error: null };
  if (profileError) throw profileError;
  const nicknameByWallet = new Map((profiles ?? []).map((profile) => [profile.wallet_address, profile.nickname]));
  return (data ?? []).map((response) => ({
    id: response.id,
    idea_id: response.idea_id,
    content_hash: response.content_hash,
    content: response.content,
    response_type: response.response_type,
    submitter_nickname: nicknameByWallet.get(String(response.submitter_wallet_address).toLowerCase()) ?? 'Contributor',
    onchain_response_id: response.onchain_response_id,
    transaction_hash: response.transaction_hash,
    block_number: response.block_number,
    timestamp: response.timestamp,
  }));
}

export async function getPublicIdea(id: string) {
  const { data, error } = await getServerSupabase()
    .from('ideas')
    .select('id, content_hash, content, record_version, record_type, sources, method, limitations, submitter_wallet_address, onchain_idea_id, transaction_hash, block_number, timestamp')
    .eq('id', id)
    .single();

  if (error) throw error;
  const nickname = await getContributorNickname(data.submitter_wallet_address);
  return {
    id: data.id,
    content_hash: data.content_hash,
    content: data.content,
    record_version: data.record_version,
    record_type: data.record_type,
    sources: data.sources,
    method: data.method,
    limitations: data.limitations,
    submitter_nickname: nickname?.nickname ?? 'Contributor',
    onchain_idea_id: data.onchain_idea_id,
    transaction_hash: data.transaction_hash,
    block_number: data.block_number,
    timestamp: data.timestamp,
  };
}

export async function hasDuplicateIdeaHash(contentHash: string) {
  const { data, error } = await getServerSupabase()
    .from('ideas')
    .select('id')
    .eq('content_hash', contentHash)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return Boolean(data);
}

export async function getSafeIdeaForResponse(id: string) {
  const { data, error } = await getServerSupabase()
    .from('ideas')
    .select('id, onchain_idea_id')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
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
  record_version?: number;
  record_type?: string | null;
  sources?: string | null;
  method?: string | null;
  limitations?: string | null;
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
    .select('content_hash, content, record_version, record_type, sources, method, limitations, submitter_wallet_address, onchain_idea_id, transaction_hash, block_number')
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
