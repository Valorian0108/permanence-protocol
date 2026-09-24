require("dotenv").config();
const BackendSigner = require("./signer");

async function testBackendSigner() {
  console.log("Testing Backend Signer...\n");
  
  const signer = new BackendSigner();
  
  // Check balance
  console.log("Checking signer balance...");
  const balance = await signer.getSignerBalance();
  console.log("Signer balance:", balance, "ETH\n");
  
  // Test posting an idea
  console.log("Testing postIdea...");
  const testHash = "0x" + Buffer.from("test idea content").toString("hex");
  const ideaResult = await signer.postIdea(testHash);
  console.log("Idea result:", JSON.stringify(ideaResult, null, 2), "\n");
  
  // Test posting a response
  if (ideaResult.success && ideaResult.ideaId) {
    console.log("Testing postResponse...");
    const responseResult = await signer.postResponse(
      ideaResult.ideaId,
      "0x" + Buffer.from("test response content").toString("hex"),
      1 // Challenge
    );
    console.log("Response result:", JSON.stringify(responseResult, null, 2), "\n");
  }
  
  console.log("Backend signer test completed!");
}

testBackendSigner()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });