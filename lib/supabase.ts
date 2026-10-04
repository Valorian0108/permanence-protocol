export interface Idea {
  id: string;
  content_hash: string;
  content: string;
  record_version?: number;
  record_type?: string | null;
  sources?: string | null;
  method?: string | null;
  limitations?: string | null;
  submitter_nickname: string;
  onchain_idea_id: number | null;
  transaction_hash: string;
  block_number: number | null;
  timestamp: string;
  response_count?: number;
}

export interface Response {
  id: string;
  idea_id: string;
  content_hash: string;
  content: string;
  response_type: string;
  submitter_nickname: string;
  onchain_response_id: number | null;
  transaction_hash: string;
  block_number: number | null;
  timestamp: string;
}

export async function getIdeas({ page, pageSize, query }: { page: number; pageSize: number; query: string }) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), query });
  const response = await fetch(`/api/archive?${params.toString()}`, { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load archive');
  return result as { ideas: Idea[]; total: number };
}

export async function getResponsesByRecordId(recordId: string) {
  const response = await fetch(`/api/archive/responses?recordId=${encodeURIComponent(recordId)}`, { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load responses');
  return result.responses as Response[];
}

export async function getRecordById(recordId: string) {
  const response = await fetch(`/api/archive/idea?recordId=${encodeURIComponent(recordId)}`, { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load record');
  return result.record as Idea;
}

export async function checkDuplicateHash(contentHash: string, accessToken: string) {
  const response = await fetch(`/api/archive/duplicate?hash=${encodeURIComponent(contentHash)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not check for a duplicate');
  return result.duplicate ? { id: 'existing' } : null;
}
