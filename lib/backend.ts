// Use relative path for same-origin API calls (works in both dev and production)
const API_BASE = '';

export async function postIdea(contentHash: string) {
  try {
    const response = await fetch(`${API_BASE}/api/post-idea`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contentHash }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error posting idea to backend:', error);
    throw error;
  }
}

export async function postResponse(ideaId: string, contentHash: string, responseType: number) {
  try {
    const response = await fetch(`${API_BASE}/api/post-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ideaId, contentHash, responseType }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error posting response to backend:', error);
    throw error;
  }
}