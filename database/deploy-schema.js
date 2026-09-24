require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

async function deploySchema() {
  console.log("Deploying database schema to Supabase...\n");
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for schema deployment");
  }
  
  // Read the schema file
  const schemaPath = "./database/schema.sql";
  const schemaSQL = fs.readFileSync(schemaPath, "utf8");
  
  console.log("Schema SQL loaded. Attempting to execute...\n");
  
  // Note: Supabase JS client doesn't support raw SQL execution directly
  // We need to provide instructions for manual deployment
  console.log("⚠️  Manual deployment required:");
  console.log("\n1. Go to your Supabase dashboard: https://app.supabase.com/");
  console.log("2. Select your project: kkhrpfjfvjihnvdbzybm");
  console.log("3. Navigate to SQL Editor");
  console.log("4. Copy and paste the following SQL:");
  console.log("\n" + "=".repeat(50));
  console.log(schemaSQL);
  console.log("=".repeat(50) + "\n");
  console.log("5. Click 'Run' to execute the schema");
  console.log("6. After successful execution, run this test again\n");
  
  console.log("Schema deployment instructions provided.");
}

deploySchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });