require("dotenv").config();
const express = require("express");
const cors = require("cors");
const BackendSigner = require("./signer");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize backend signer
const signer = new BackendSigner();

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend signer is running" });
});

// Get signer balance endpoint
app.get("/balance", async (req, res) => {
  try {
    const balance = await signer.getSignerBalance();
    res.json({ balance, address: signer.wallet.address });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post idea endpoint
app.post("/api/post-idea", async (req, res) => {
  try {
    const { contentHash } = req.body;
    
    if (!contentHash) {
      return res.status(400).json({ error: "contentHash is required" });
    }
    
    console.log("Received post-idea request:", contentHash);
    const result = await signer.postIdea(contentHash);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("Error in post-idea endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

// Post response endpoint
app.post("/api/post-response", async (req, res) => {
  try {
    const { ideaId, contentHash, responseType } = req.body;
    
    if (!ideaId || !contentHash || responseType === undefined) {
      return res.status(400).json({ 
        error: "ideaId, contentHash, and responseType are required" 
      });
    }
    
    // Validate responseType
    if (![0, 1, 2].includes(responseType)) {
      return res.status(400).json({ 
        error: "responseType must be 0 (Support), 1 (Challenge), or 2 (Evidence)" 
      });
    }
    
    console.log("Received post-response request:", { ideaId, contentHash, responseType });
    const result = await signer.postResponse(ideaId, contentHash, responseType);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("Error in post-response endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend signer API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});