import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";
import { createAgent, tool } from "langchain";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { z } from "zod";

// ---- __dirname for ESM ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- MongoDB native client ----
let mongoClient: MongoClient | null = null;

const getMongoClient = async (): Promise<MongoClient> => {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGODB_URI || "");
    await mongoClient.connect();
  }
  return mongoClient;
};

// ---- Google GenAI Embeddings ----
// gemini-embedding-001 → default 3072 dimensions (FREE, same API key as Gemini chat)
const getEmbeddings = () => {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not set in .env!");
  }
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-embedding-001",
  });
};

// ---- Vector Store ----
const getVectorStore = async () => {
  const client = await getMongoClient();
  const collection = client.db("edureach_db").collection("knowledge_docs");

  return new MongoDBAtlasVectorSearch(getEmbeddings(), {
    collection: collection as any,
    indexName: "edureachvectorindex",
    textKey: "text",
    embeddingKey: "embedding",
  });
};

// ============================================
// A) INDEXING & VALIDATION — runs ONCE at server startup
// ============================================
let isGroqValidated = false;

export const validateGroqConfig = async (): Promise<void> => {
  if (isGroqValidated) return;

  const groqApiKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  if (!groqApiKey || groqApiKey === "gsk_your_groq_api_key_here" || !groqApiKey.startsWith("gsk_")) {
    console.error("[Groq Configuration Error]\nGROQ_API_KEY is missing or invalid in environment variables!");
    throw new Error("GROQ_API_KEY is missing or invalid in environment variables.");
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
      },
    });

    if (!res.ok) {
      console.error(`[Groq Configuration Error]\nConfigured Groq model is unavailable.\n\nModel:\n${groqModel}`);
      throw new Error(`Groq API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as { data?: Array<{ id: string; active?: boolean }> };
    const availableModels = data.data?.map((m) => m.id) || [];

    if (!availableModels.includes(groqModel)) {
      console.error(`[Groq Configuration Error]\nConfigured Groq model is unavailable.\n\nModel:\n${groqModel}`);
      throw new Error(`Configured Groq model '${groqModel}' is not accessible for the configured API key.`);
    }

    isGroqValidated = true;
    console.log(` Groq configuration verified (Model: ${groqModel})`);
  } catch (error: any) {
    if (!error.message?.includes("Configured Groq model")) {
      console.error(`[Groq Configuration Error]\nConfigured Groq model is unavailable.\n\nModel:\n${groqModel}`);
    }
    throw error;
  }
};

export const initializeKnowledgeBase = async (): Promise<void> => {
  // Validate Groq configuration on server startup
  await validateGroqConfig();

  const client = await getMongoClient();
  const collection = client.db("edureach_db").collection("knowledge_docs");

  const filePath = path.join(__dirname, "../../knowledge-base/kks-knowledge.txt");
  const stats = fs.statSync(filePath);
  const fileMtime = stats.mtimeMs;

  const metadataCollection = client.db("edureach_db").collection("metadata");
  const lastIndex = await metadataCollection.findOne({ key: "kb_last_index" });

  const docWithEmbedding = await collection.findOne({
    embedding: { $exists: true, $not: { $size: 0 } },
  });

  // Re-index IF: No data exists OR the file is newer than the last index record
  const needsReindex = !docWithEmbedding || !lastIndex || fileMtime > lastIndex.mtime;

  if (!needsReindex) {
    const count = await collection.countDocuments();
    console.log(` Knowledge base ready (${count} chunks, last updated: ${new Date(lastIndex!.mtime).toLocaleString()})`);
    return;
  }

  console.log(` Re-indexing knowledge base... Reason: ${!docWithEmbedding ? 'No data' : 'File updated'}`);
  await collection.deleteMany({});

  // Verify API key FIRST with a test embedding
  const embeddings = getEmbeddings();
  try {
    const testResult = await embeddings.embedQuery("test");
    console.log(` API key OK — embedding dimensions: ${testResult.length}`);
  } catch (error: any) {
    console.error(" Embedding test failed!");
    console.error("   Error:", error.message || error);
    console.error("   Get key from: https://aistudio.google.com/apikey");
    throw error;
  }

  // LOAD
  const loader = new TextLoader(filePath);
  const docs = await loader.load();
  if (docs.length === 0) {
    throw new Error("No documents found in knowledge base file");
  }
  const totalCharacters = docs.reduce((sum, doc) => sum + doc.pageContent.length, 0);
  console.log(`    Loaded ${totalCharacters} characters`);

  // SPLIT
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const allSplits = await splitter.splitDocuments(docs);
  console.log(`    Split into ${allSplits.length} chunks`);

  // EMBED + STORE
  const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection: collection as any,
    indexName: "edureachvectorindex",
    textKey: "text",
    embeddingKey: "embedding",
  });

  await vectorStore.addDocuments(allSplits);

  // Update metadata with the new timestamp
  await metadataCollection.updateOne(
    { key: "kb_last_index" },
    { $set: { mtime: fileMtime, indexedAt: Date.now() } },
    { upsert: true }
  );

  // VERIFY
  const verifyDoc = await collection.findOne({
    embedding: { $exists: true, $not: { $size: 0 } },
  });

  if (verifyDoc && Array.isArray(verifyDoc.embedding) && verifyDoc.embedding.length > 0) {
    console.log(`    ${allSplits.length} chunks stored (${verifyDoc.embedding.length}D embeddings)`);
    console.log(`     IMPORTANT: Create Atlas Vector Search index with numDimensions: ${verifyDoc.embedding.length}`);
  } else {
    await collection.deleteMany({});
    throw new Error(" Embeddings are empty! Google API returned no vectors.");
  }
};

// ============================================
// B) AGENT — runs on every chat query
// ============================================
const createRetrieveTool = (vectorStore: MongoDBAtlasVectorSearch) => {
  return tool(
    async ({ query }: { query: string }) => {
      const retrievedDocs = await vectorStore.similaritySearch(query, 5); // Increased for better context
      console.log(`[Retrieve Tool] Query: "${query}" | Found: ${retrievedDocs.length} chunks`);
      return retrievedDocs
        .map((doc) => `Source: ${doc.metadata.source}\nContent: ${doc.pageContent}`)
        .join("\n\n");
    },
    {
      name: "retrieve",
      description:
        "Retrieve information from the Kks College knowledge base. " +
        "Use this for any questions about Kks, courses, fees, admissions, mentors, campus, placements.",
      schema: z.object({ query: z.string() }),
    }
  );
};

export const getRAGResponse = async (question: string): Promise<string> => {
  try {
    await validateGroqConfig();

    const vectorStore = await getVectorStore();
    const retrieve = createRetrieveTool(vectorStore);

    const groqApiKey = process.env.GROQ_API_KEY!;
    const groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

    const model = new ChatGroq({
      apiKey: groqApiKey,
      model: groqModel,
      temperature: 0.7,
    });

    const agent = createAgent({
      model,
      tools: [retrieve],
      systemPrompt:
        "You are Kks Bot, a helpful AI counselor for Kks College, Hyderabad. " +
        "ALWAYS use the retrieve tool to search the knowledge base before answering any question. " +
        "Only answer using the facts provided in the knowledge base retrieved by the retrieve tool. " +
        "If the information is not found or if the question is unrelated to Kks College, say exactly: " +
        "'I don't have that information right now. Click Talk to Us to speak with a counselor.'",
    });

    const result = await agent.invoke({
      messages: [{ role: "user", content: question }],
    });

    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) {
      return "I couldn't generate a response. Please try again.";
    }

    return typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);
  } catch (error: any) {
    const groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
    console.error("[RAG Agent Error]", {
      provider: "Groq",
      model: groqModel,
      status: error?.status || error?.statusCode || "UNKNOWN",
      code: error?.code || error?.error?.code || error?.name || "UNKNOWN",
      message: error?.message || "Unknown error in RAG agent workflow",
    });
    return "I'm having trouble right now. Please try again or click 'Talk to Us'.";
  }
};