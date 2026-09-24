import { ethers } from 'ethers';

// Contract ABI (full contract including events)
const contractABI = [
  "function postIdea(string calldata contentHash) external returns (uint256)",
  "function postResponse(uint256 ideaId, string calldata contentHash, uint8 responseType) external returns (uint256)",
  "function getIdea(uint256 ideaId) external view returns (tuple(uint256 id, string contentHash, address submitter, uint256 timestamp))",
  "function getResponse(uint256 responseId) external view returns (tuple(uint256 id, uint256 ideaId, string contentHash, uint8 responseType, address submitter, uint256 timestamp))",
  "function getResponsesByIdea(uint256 ideaId) external view returns (tuple(uint256 id, uint256 ideaId, string contentHash, uint8 responseType, address submitter, uint256 timestamp)[])",
  "event IdeaPosted(uint256 indexed ideaId, string contentHash, address indexed submitter, uint256 timestamp)",
  "event ResponsePosted(uint256 indexed ideaId, uint256 indexed responseId, string contentHash, uint8 responseType, address indexed submitter, uint256 timestamp)"
];

// Contract address from deployment
const CONTRACT_ADDRESS = "0x213B5321d98B2E01204C827712Ca9D580cEF9bEd";

export class BackendSigner {
  private wallet!: ethers.Wallet;
  private provider!: ethers.JsonRpcProvider;
  private signer!: ethers.Wallet;
  private contract!: ethers.Contract;

  constructor() {
    this.setupSigner();
  }

  setupSigner() {
    // Initialize the backend signer wallet from environment variable
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("PRIVATE_KEY environment variable is not set");
    }

    this.wallet = new ethers.Wallet(privateKey);
    
    // Connect to the RPC provider
    const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL;
    if (!rpcUrl) {
      throw new Error("ARBITRUM_SEPOLIA_RPC_URL environment variable is not set");
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = this.wallet.connect(this.provider);
    
    // Create contract instance
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, this.signer);
    
    console.log("Backend signer initialized");
    console.log("Signer address:", this.wallet.address);
  }

  async postIdea(contentHash: string) {
    try {
      console.log("Posting idea with hash:", contentHash);
      
      const tx = await this.contract.postIdea(contentHash);
      console.log("Transaction submitted:", tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed in block:", receipt.blockNumber);
      
      // Parse the event to get the idea ID
      let ideaId = null;
      for (const log of receipt.logs) {
        try {
          // Check if this log matches our contract address
          if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
            continue;
          }
          const parsed = this.contract.interface.parseLog(log);
          if (parsed && parsed.name === "IdeaPosted") {
            ideaId = parsed.args.ideaId;
            console.log("Idea ID:", ideaId.toString());
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber.toString(),
        ideaId: ideaId ? ideaId.toString() : null
      };
    } catch (error) {
      console.error("Error posting idea:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async postResponse(ideaId: string, contentHash: string, responseType: number) {
    try {
      console.log("Posting response for idea:", ideaId);
      console.log("Response type:", responseType);
      console.log("Content hash:", contentHash);
      
      const tx = await this.contract.postResponse(ideaId, contentHash, responseType);
      console.log("Transaction submitted:", tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed in block:", receipt.blockNumber);
      
      // Parse the event to get the response ID
      let responseId = null;
      for (const log of receipt.logs) {
        try {
          // Check if this log matches our contract address
          if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
            continue;
          }
          const parsed = this.contract.interface.parseLog(log);
          if (parsed && parsed.name === "ResponsePosted") {
            responseId = parsed.args[1]; // responseId is the second indexed parameter
            console.log("Response ID:", responseId.toString());
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber.toString(),
        responseId: responseId ? responseId.toString() : null
      };
    } catch (error) {
      console.error("Error posting response:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getSignerBalance() {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }
}