require("dotenv").config();
const crypto = require('crypto');
const DatabaseClient = require("./client");

// Import backend signer functions
const BackendSigner = require("../backend/signer");
const signer = new BackendSigner();

const SEED_IDEAS = [
  {
    content: "History shows that consensus is often wrong. Dissenters get forgotten or rewritten, and the majority opinion becomes the 'truth' by default. Permanence Protocol prevents this by locking ideas in their original form - even if the consensus shifts, the original idea remains exactly as it was stated.",
    responses: [
      {
        content: "This is exactly why we need cryptographic proofs of original content. The ability to rewrite history is dangerous when it erases dissent.",
        type: "Support"
      },
      {
        content: "But what about when ideas genuinely need to be corrected? If someone posts factually wrong information, shouldn't that be editable?",
        type: "Challenge"
      }
    ]
  },
  {
    content: "Software rot is real. Documentation disappears, links break, APIs change, and we build entire systems on disappearing foundations. Permanence Protocol treats code and documentation like archival documents - once preserved, they remain verifiable forever.",
    responses: [
      {
        content: "The academic citation system assumes immutability that doesn't exist. Links rot, papers disappear, and references become meaningless. This is a real problem.",
        type: "Evidence"
      },
      {
        content: "What about the cost of storing everything forever? Not all documentation is worth preserving at the blockchain level.",
        type: "Challenge"
      }
    ]
  },
  {
    content: "Academic citations assume immutability that doesn't exist. A cited paper might be retracted, edited, or disappear entirely. What if citations were cryptographic proofs? You could verify that the paper you cite still exists and says what you claim it says.",
    responses: [
      {
        content: "This would transform how academic discourse works. Citations would become verifiable rather than symbolic.",
        type: "Support"
      },
      {
        content: "The infrastructure cost would be significant. Academic publishing already has economic challenges.",
        type: "Challenge"
      }
    ]
  },
  {
    content: "The ability to edit history is both a feature and a liability. Wikipedia allows edits, but keeps revision history. Permanence Protocol takes this further - the original content is cryptographically locked, while transparent editing can happen in the discussion layer. The artifact remains; the conversation evolves.",
    responses: [
      {
        content: "This distinction between content and commentary is crucial. The primary source is immutable; the discourse around it can evolve.",
        type: "Support"
      },
      {
        content: "How do you handle the case where the original content is factually wrong or harmful? Locking it forever seems problematic.",
        type: "Challenge"
      }
    ]
  }
];

async function computeHash(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function seedDatabase() {
  console.log("Starting seed data population...\n");
  
  const db = new DatabaseClient();
  const walletAddress = "0x87a3724BC07126751A7B6f30D90D5E8C07107863"; // Backend signer address
  
  // Clear existing test data first
  console.log("Clearing existing test data...");
  try {
    const existingIdeas = await db.getIdeas();
    if (existingIdeas.length > 0) {
      console.log(`Found ${existingIdeas.length} existing ideas, deleting...`);
      // Note: We can't actually delete due to RLS policies, so we'll skip duplicates
      console.log("Skipping due to RLS policies. Will check for duplicates instead.");
    }
  } catch (error) {
    console.log("No existing data to clear.");
  }
  
  for (let i = 0; i < SEED_IDEAS.length; i++) {
    const seedIdea = SEED_IDEAS[i];
    console.log(`\nSeeding idea ${i + 1}/${SEED_IDEAS.length}:`);
    console.log(`Content: "${seedIdea.content.substring(0, 50)}..."`);
    
    try {
      // Compute hash
      const contentHash = await computeHash(seedIdea.content);
      console.log(`Content Hash: ${contentHash}`);
      
      // Check for duplicate in database first
      const existingDuplicate = await db.checkDuplicateHash(contentHash);
      if (existingDuplicate) {
        console.log(`⚠ Idea already exists in database (ID: ${existingDuplicate.id}), skipping database insert`);
        console.log(`✓ Already on-chain with transaction: ${existingDuplicate.transaction_hash}`);
        
        // Still post responses if not already present
        if (seedIdea.responses && seedIdea.responses.length > 0) {
          console.log(`\n  Checking responses...`);
          const existingResponses = await db.getResponsesByIdeaId(existingDuplicate.id);
          
          for (let j = 0; j < seedIdea.responses.length; j++) {
            const response = seedIdea.responses[j];
            const responseHash = await computeHash(response.content);
            const responseTypeMap = { 'Support': 0, 'Challenge': 1, 'Evidence': 2 };
            
            // Check if this response already exists
            const responseExists = existingResponses.some(r => r.content_hash === responseHash);
            if (responseExists) {
              console.log(`  ✓ Response already exists, skipping`);
              continue;
            }
            
            console.log(`  Response ${j + 1}: ${response.type}`);
            console.log(`  Posting to blockchain...`);
            const responseBlockchainResult = await signer.postResponse(
              blockchainResult.ideaId.toString(),
              responseHash,
              responseTypeMap[response.type]
            );
            
            if (!responseBlockchainResult.success) {
              throw new Error("Response blockchain submission failed");
            }
            
            console.log(`  ✓ Response blockchain success! Transaction: ${responseBlockchainResult.transactionHash}`);
            
            await db.insertResponse({
              idea_id: existingDuplicate.id,
              content_hash: responseHash,
              content: response.content,
              response_type: response.type,
              submitter_wallet_address: walletAddress,
              onchain_response_id: parseInt(responseBlockchainResult.responseId),
              transaction_hash: responseBlockchainResult.transactionHash,
              block_number: parseInt(responseBlockchainResult.blockNumber),
            });
            
            console.log(`  ✓ Response database success!`);
          }
        }
        
        console.log(`\n✓ Idea ${i + 1} already seeded, skipping.`);
        continue;
      }
      
      if (!blockchainResult.success) {
        throw new Error("Blockchain submission failed");
      }
      
      console.log(`✓ Blockchain success! Transaction: ${blockchainResult.transactionHash}`);
      console.log(`✓ On-chain Idea ID: ${blockchainResult.ideaId}`);
      console.log(`✓ Block: ${blockchainResult.blockNumber}`);
      
      // Store in Supabase
      console.log("Storing in Supabase...");
      const ideaData = await db.insertIdea({
        content_hash: contentHash,
        content: seedIdea.content,
        submitter_wallet_address: walletAddress,
        onchain_idea_id: parseInt(blockchainResult.ideaId),
        transaction_hash: blockchainResult.transactionHash,
        block_number: parseInt(blockchainResult.blockNumber),
      });
      
      console.log(`✓ Database success! Idea ID: ${ideaData.id}`);
      
      // Post responses
      if (seedIdea.responses && seedIdea.responses.length > 0) {
        console.log(`\n  Posting ${seedIdea.responses.length} responses...`);
        
        for (let j = 0; j < seedIdea.responses.length; j++) {
          const response = seedIdea.responses[j];
          console.log(`  Response ${j + 1}: ${response.type}`);
          
          const responseHash = await computeHash(response.content);
          const responseTypeMap = { 'Support': 0, 'Challenge': 1, 'Evidence': 2 };
          
          console.log(`  Posting to blockchain...`);
          const responseBlockchainResult = await signer.postResponse(
            blockchainResult.ideaId.toString(),
            responseHash,
            responseTypeMap[response.type]
          );
          
          if (!responseBlockchainResult.success) {
            throw new Error("Response blockchain submission failed");
          }
          
          console.log(`  ✓ Response blockchain success! Transaction: ${responseBlockchainResult.transactionHash}`);
          
          await db.insertResponse({
            idea_id: ideaData.id,
            content_hash: responseHash,
            content: response.content,
            response_type: response.type,
            submitter_wallet_address: walletAddress,
            onchain_response_id: parseInt(responseBlockchainResult.responseId),
            transaction_hash: responseBlockchainResult.transactionHash,
            block_number: parseInt(responseBlockchainResult.blockNumber),
          });
          
          console.log(`  ✓ Response database success!`);
        }
      }
      
      console.log(`\n✓ Idea ${i + 1} seeded successfully!`);
      
      // Wait a bit between ideas to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`✗ Failed to seed idea ${i + 1}:`, error.message);
    }
  }
  
  console.log("\n✓ Seed data population complete!");
}

seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed data failed:", error);
    process.exit(1);
  });