require("dotenv").config();
const hre = require("hardhat");

async function main() {
  console.log("Checking transaction status...");
  
  const txHash = "0xccca37b47d"; // From the screenshot
  
  try {
    const tx = await hre.ethers.provider.getTransaction(txHash);
    console.log("Transaction found:", txHash);
    console.log("From:", tx.from);
    console.log("To:", tx.to);
    console.log("Value:", hre.ethers.formatEther(tx.value), "ETH");
    console.log("Block:", tx.blockNumber);
    console.log("Confirmations:", tx.confirmations);
  } catch (error) {
    console.log("Transaction not found or pending:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });