import dotenv from "dotenv";
dotenv.config();

import app from "./app.ts";
import connectDB from "./config/database.config.ts";
import { initializeKnowledgeBase } from "./services/rag.service.ts";

const PORT = process.env.PORT || 5000;

let isInitialized = false;

const start = async (): Promise<void> => {
  try {
    if (!isInitialized) {
      // Connect DB
      await connectDB();

      // Initialize vector database
      //await initializeKnowledgeBase();

      isInitialized = true;

      console.log("Database connected");
      console.log("Knowledge base initialized");
    }

    // Start Express
    app.listen(PORT, () => {
      console.log(`KKS Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();

export default app;