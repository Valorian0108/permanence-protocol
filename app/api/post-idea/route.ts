import { NextRequest, NextResponse } from 'next/server';
import { BackendSigner } from '../../../lib/signer';

export async function POST(request: NextRequest) {
  try {
    const { contentHash } = await request.json();
    
    if (!contentHash) {
      return NextResponse.json(
        { error: "contentHash is required" },
        { status: 400 }
      );
    }
    
    console.log("Received post-idea request:", contentHash);
    
    // Initialize signer (this will throw if env vars are missing)
    const signer = new BackendSigner();
    const result = await signer.postIdea(contentHash);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error("Error in post-idea endpoint:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}