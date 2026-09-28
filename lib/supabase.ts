import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface Idea {
  id: string;
  content_hash: string;
  content: string;
  submitter_wallet_address: string;
  onchain_idea_id: number | null;
  transaction_hash: string;
  block_number: number | null;
  timestamp: string;
}

export interface Response {
  id: string;
  idea_id: string;
  content_hash: string;
  content: string;
  response_type: string;
  submitter_wallet_address: string;
  onchain_response_id: number | null;
  transaction_hash: string;
  block_number: number | null;
  timestamp: string;
}

export async function getIdeas() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getResponsesByIdeaId(ideaId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .eq('idea_id', ideaId)
    .order('timestamp', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getIdeaById(id: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function checkDuplicateHash(contentHash: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('ideas')
    .select('id')
    .eq('content_hash', contentHash)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
