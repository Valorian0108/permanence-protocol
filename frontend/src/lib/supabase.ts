import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export async function insertIdea(ideaData: {
  content_hash: string;
  content: string;
  submitter_wallet_address: string;
  onchain_idea_id: number;
  transaction_hash: string;
  block_number: number;
}) {
  const { data, error } = await supabase
    .from('ideas')
    .insert(ideaData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getIdeas() {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data;
}

export async function insertResponse(responseData: {
  idea_id: string;
  content_hash: string;
  content: string;
  response_type: string;
  submitter_wallet_address: string;
  onchain_response_id: number;
  transaction_hash: string;
  block_number: number;
}) {
  const { data, error } = await supabase
    .from('responses')
    .insert(responseData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getResponsesByIdeaId(ideaId: string) {
  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .eq('idea_id', ideaId)
    .order('timestamp', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getIdeaById(id: string) {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function checkDuplicateHash(contentHash: string) {
  const { data, error } = await supabase
    .from('ideas')
    .select('id')
    .eq('content_hash', contentHash)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}