require("dotenv").config();
const DatabaseClient = require("./client");

async function testDatabase() {
  console.log("Testing Database Client...\n");
  
  const db = new DatabaseClient();
  
  if (!db.client) {
    console.log("Database client not initialized. Check your Supabase credentials.");
    return;
  }
  
  console.log("Database client initialized successfully!\n");
  
  // Test inserting an idea
  console.log("Testing insertIdea...");
  const testIdea = {
    content_hash: "0x" + Buffer.from("test idea content").toString("hex"),
    content: "test idea content",
    submitter_wallet_address: "0x87a3724BC07126751A7B6f30D90D5E8C07107863",
    onchain_idea_id: 0,
    transaction_hash: "0x" + Buffer.from("test tx hash").toString("hex"),
    block_number: 123456
  };
  
  try {
    const insertedIdea = await db.insertIdea(testIdea);
    console.log("Inserted idea:", insertedIdea);
    console.log("Idea ID:", insertedIdea.id);
  } catch (error) {
    console.log("Insert failed (expected if schema not deployed):", error.message);
  }
  
  // Test checking duplicate hash
  console.log("\nTesting checkDuplicateHash...");
  try {
    const duplicate = await db.checkDuplicateHash(testIdea.content_hash);
    console.log("Duplicate check result:", duplicate);
  } catch (error) {
    console.log("Duplicate check failed:", error.message);
  }
  
  // Test fetching ideas
  console.log("\nTesting getIdeas...");
  try {
    const ideas = await db.getIdeas();
    console.log("Fetched ideas:", ideas.length);
    if (ideas.length > 0) {
      console.log("First idea:", ideas[0]);
    }
  } catch (error) {
    console.log("Fetch ideas failed:", error.message);
  }
  
  console.log("\nDatabase client test completed!");
}

testDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });