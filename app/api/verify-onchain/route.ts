import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export const runtime = 'nodejs';

const contractAddress = '0x213B5321d98B2E01204C827712Ca9D580cEF9bEd';
const contractInterface = new ethers.Interface([
  'function getIdea(uint256 ideaId) view returns (tuple(uint256 id, string contentHash, address submitter, uint256 timestamp))',
  'function getResponse(uint256 responseId) view returns (tuple(uint256 id, uint256 ideaId, string contentHash, uint8 responseType, address submitter, uint256 timestamp))',
]);

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get('kind');
  const id = request.nextUrl.searchParams.get('id');

  if ((kind !== 'idea' && kind !== 'response') || !id || !/^\d{1,78}$/.test(id)) {
    return NextResponse.json({ error: 'A valid record kind and on-chain ID are required' }, { status: 400 });
  }

  const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL;
  if (!rpcUrl) {
    return NextResponse.json({ error: 'Blockchain verification is not configured' }, { status: 503 });
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    if (network.chainId !== 421614n) {
      return NextResponse.json({ error: 'Configured RPC is not connected to Arbitrum Sepolia' }, { status: 503 });
    }

    const functionName = kind === 'idea' ? 'getIdea' : 'getResponse';
    const callData = contractInterface.encodeFunctionData(functionName, [BigInt(id)]);
    const rawResult = await provider.call({ to: contractAddress, data: callData });
    const [record] = contractInterface.decodeFunctionResult(functionName, rawResult);
    const onchainId: bigint = record.id;
    const contentHash: string = record.contentHash;

    if (onchainId !== BigInt(id) || !/^0x[a-fA-F0-9]{64}$/.test(contentHash)) {
      return NextResponse.json({ error: 'The contract returned an invalid record' }, { status: 502 });
    }

    return NextResponse.json({ kind, id, contentHash: contentHash.toLowerCase() }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.warn('On-chain hash lookup failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Could not read this record from Arbitrum Sepolia' }, { status: 502 });
  }
}
