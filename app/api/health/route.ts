import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    message: "Backend signer API is running" 
  });
}