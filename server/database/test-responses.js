require("dotenv").config();
const DatabaseClient = require("./client");

async function testResponses() {
  console.log("Testing Responses Functionality...\n");
  
  const db = new DatabaseClient();
  
  // Test inserting a response
  console.log("Testing insertResponse...");
  const testResponse = {
    idea_id: '7f95b188-baf3-47ea-9dde-79a9e2a73d67', // Use the idea ID from previous test
    content_hash: "0x" + Buffer.from("test response content").toString("hex"),
    content: "test response content",
    response_type: "Support",
    submitter_wallet_address: "0x87a3724BC07126751A7B6f30D90D5E8C07107863",
    onchain_response_id: 0,
    transaction_hash: "0x" + Buffer.from("test response tx hash").toString("hex"),
    block_number: 123457
  };
  
  try {
    const insertedResponse = await db.insertResponse(testResponse);
    console.log("Inserted response:", insertedResponse);
    console.log("Response ID:", insertedResponse.id);
  } catch (error) {
    console.log("Insert response failed:", error.message);
    return;
  }
  
  // Test fetching responses by idea ID
  console.log("\nTesting getResponsesByIdeaId...");
  try {
    const responses = await db.getResponsesByIdeaId('7f95b188-baf3-47ea-9dde-79a9e2a73d67');
    console.log("Fetched responses:", responses.length);
    if (responses.length > 0) {
      console.log("First response:", responses[0]);
    }
  } catch (error) {
    console.log("Fetch responses failed:", error.message);
  }
  
  console.log("\nResponses test completed!");
}

testResponses()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });