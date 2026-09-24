require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Deploying PermanenceProtocol to Arbitrum Sepolia...");

  const [deployer] = await hre.ethers.getSigners();
  
  if (!deployer) {
    throw new Error("No deployer account found. Make sure PRIVATE_KEY is set in .env");
  }
  
  console.log("Deploying with account:", deployer.address);

  const PermanenceProtocol = await hre.ethers.getContractFactory("PermanenceProtocol");
  const contract = await PermanenceProtocol.deploy();
  
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  
  console.log("PermanenceProtocol deployed to:", address);
  
  // Wait for confirmations
  console.log("Waiting for block confirmations...");
  await contract.deploymentTransaction().wait(5);
  
  // Verify contract on Arbiscan
  console.log("Verifying contract on Arbiscan...");
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: []
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.log("Contract verification failed (may already be verified):", error.message);
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: "arbitrumSepolia",
    address: address,
    deployer: deployer.address,
    deploymentHash: contract.deploymentTransaction().hash,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    "./deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment info saved to deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });