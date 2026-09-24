require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

class DatabaseClient {
  constructor() {
    this.client = null;
    this.initialize();
  }

  initialize() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log("Supabase credentials not found. Database operations will be disabled.");
      console.log("Set SUPABASE_URL and SUPABASE_ANON_KEY in .env to enable database.");
      return;
    }

    this.client = createClient(supabaseUrl, supabaseKey);
    console.log("Database client initialized");
  }

  async insertIdea(ideaData) {
    if (!this.client) {
      throw new Error("Database client not initialized");
    }

    const { data, error } = await this.client
      .from('ideas')
      .insert(ideaData)
      .select()
      .single();

    if (error) {
      console.error("Error inserting idea:", error);
      throw error;
    }

    return data;
  }

  async insertResponse(responseData) {
    if (!this.client) {
      throw new Error("Database client not initialized");
    }

    const { data, error } = await this.client
      .from('responses')
      .insert(responseData)
      .select()
      .single();

    if (error) {
      console.error("Error inserting response:", error);
      throw error;
    }

    return data;
  }

  async getIdeas() {
    if (!this.client) {
      throw new Error("Database client not initialized");
    }

    const { data, error } = await this.client
      .from('ideas')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error("Error fetching ideas:", error);
      throw error;
    }

    return data;
  }

  async getIdeaById(id) {
    if (!this.client) {
      throw new Error("Database client not initialized");
    }

    const { data, error } = await this.client
      .from('ideas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching idea:", error);
      throw error;
    }

    return data;
  }

  async getResponsesByIdeaId(ideaId) {
    if (!this.client) {
      throw new Error("Database client not initialized");
    }

    const { data, error } = await this.client
      .from('responses')
      .select('*')
      .eq('idea_id', ideaId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error("Error fetching responses:", error);
      throw error;
    }

    return data;
  }

  async getResponsesByIdeaId(ideaId) {
    if (!this.client) {
      throw new Error("Database client not initialized");
    }

    const { data, error } = await this.client
      .from('responses')
      .select('*')
      .eq('idea_id', ideaId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error("Error fetching responses:", error);
      throw error;
    }

    return data;
  }

  async checkDuplicateHash(contentHash) {
    if (!this.client) {
      throw new Error("Database client not initialized");
    }

    const { data, error } = await this.client
      .from('ideas')
      .select('id')
      .eq('content_hash', contentHash)
      .maybeSingle();

    if (error) {
      console.error("Error checking duplicate hash:", error);
      throw error;
    }

    return data; // Returns null if no duplicate found
  }
}

module.exports = DatabaseClient;