require("dotenv").config();
const hre = require("hardhat");

async function main() {
  console.log("Checking wallet balance on Arbitrum Sepolia...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Wallet address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");
  
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  console.log("Current block:", blockNumber);
  
  console.log("\nRPC URL:", process.env.ARBITRUM_SEPOLIA_RPC_URL);
  console.log("Chain ID:", await hre.ethers.provider.getNetwork());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });