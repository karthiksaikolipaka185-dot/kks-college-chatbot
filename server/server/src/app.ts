// ============================================
// FILE: src/app.ts
// PURPOSE: Configure Express — middleware, routes, Swagger docs, error handling
// ============================================

import express from "express";
import type { Application, Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.config.ts";
import chatRoutes from "./routes/chat.routes.ts";
import authRoutes from "./routes/auth.routes.ts";
import vapiRoutes from "./routes/vapi.routes.ts";
import errorHandler from "./middleware/error-handler.middleware.ts";

const app: Application = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://kks-chatbot-frontend.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Swagger UI options (using CDN assets for full local & serverless compatibility)
const swaggerUiOptions: swaggerUi.SwaggerOptions = {
  customSiteTitle: "KKS College Chatbot API Documentation",
  customCssUrl: "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css",
  customJs: [
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js",
  ],
};

// Swagger / OpenAPI documentation endpoints
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.get("/api/docs.json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json(swaggerSpec);
});

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/vapi", vapiRoutes);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
