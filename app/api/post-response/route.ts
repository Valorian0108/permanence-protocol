import { NextRequest, NextResponse } from 'next/server';
import { BackendSigner } from '../../../lib/signer';

export async function POST(request: NextRequest) {
  try {
    const { ideaId, contentHash, responseType } = await request.json();
    
    if (!ideaId || !contentHash || responseType === undefined) {
      return NextResponse.json(
        { error: "ideaId, contentHash, and responseType are required" },
        { status: 400 }
      );
    }
    
    // Validate responseType
    if (![0, 1, 2].includes(responseType)) {
      return NextResponse.json(
        { error: "responseType must be 0 (Support), 1 (Challenge), or 2 (Evidence)" },
        { status: 400 }
      );
    }
    
    console.log("Received post-response request:", { ideaId, contentHash, responseType });
    
    // Initialize signer (this will throw if env vars are missing)
    const signer = new BackendSigner();
    const result = await signer.postResponse(ideaId, contentHash, responseType);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error("Error in post-response endpoint:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}