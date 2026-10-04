import type { RecordContext } from './record-hash';

// Use relative path for same-origin API calls (works in both dev and production)
const API_BASE = '';

export async function postIdea(
  content: string,
  contentHash: string,
  recordContext: RecordContext,
  accessToken: string,
) {
  try {
    const response = await fetch(`${API_BASE}/api/post-idea`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ content, contentHash, ...recordContext, recordVersion: 2 }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Backend API error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Error posting idea to backend:', error);
    throw error;
  }
}

export async function postResponse(ideaId: string, content: string, contentHash: string, responseType: number, accessToken: string) {
  try {
    const response = await fetch(`${API_BASE}/api/post-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ ideaId, content, contentHash, responseType }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Backend API error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Error posting response to backend:', error);
    throw error;
  }
}
