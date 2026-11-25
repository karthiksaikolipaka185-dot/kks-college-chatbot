export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "KKS College Chatbot & Intelligence Platform API",
    version: "1.0.0",
    description:
      "Interactive OpenAPI documentation for the KKS College Chatbot backend. Provides endpoints for user authentication, RAG conversational chat, and Vapi AI voice counseling.",
    contact: {
      name: "KKS College DevOps & Engineering Team",
      email: "karthiksaikolipaka185@gmail.com",
    },
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local Development Server",
    },
    {
      url: "https://kks-chatbot-backend.vercel.app",
      description: "Production Vercel Server",
    },
  ],
  tags: [
    { name: "Health", description: "Health check and service status" },
    { name: "Authentication", description: "User registration, login, and profile operations" },
    { name: "Chat", description: "Conversational RAG AI queries" },
    { name: "Voice Assistant", description: "Vapi AI outbound voice counseling calls" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "API Health Check",
        description: "Returns the operational status of the backend API service.",
        responses: {
          "200": {
            description: "Service is operational",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    status: { type: "string", example: "healthy" },
                    timestamp: { type: "string", format: "date-time", example: "2026-11-25T14:30:00.000Z" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register New User Account",
        description: "Creates a new user profile with hashed password credentials and returns a signed JWT.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RegisterRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Account successfully created",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthSuccessResponse",
                },
              },
            },
          },
          "400": {
            description: "Validation error (missing fields or password < 6 characters)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Password must be at least 6 characters.",
                },
              },
            },
          },
          "409": {
            description: "Conflict (email address already registered)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "An account with this email already exists.",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "User Login",
        description: "Authenticates existing user credentials and returns a signed JWT bearer token.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Authentication successful",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthSuccessResponse",
                },
              },
            },
          },
          "400": {
            description: "Missing email or password",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Email and password are required.",
                },
              },
            },
          },
          "401": {
            description: "Invalid email or password",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Invalid email or password.",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get Current User Profile",
        description: "Retrieves the authenticated user's profile based on the JWT Bearer token.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Profile successfully retrieved",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserProfileResponse",
                },
              },
            },
          },
          "401": {
            description: "Missing, expired, or invalid authorization token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Access denied. No token provided.",
                },
              },
            },
          },
          "404": {
            description: "User not found in database",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "User not found.",
                },
              },
            },
          },
        },
      },
    },
    "/api/chat/message": {
      post: {
        tags: ["Chat"],
        summary: "Send Question to RAG AI Assistant",
        description: "Queries the KKS College knowledge base using Retrieval-Augmented Generation (RAG) and Groq LLM.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ChatMessageRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "AI response generated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ChatMessageResponse",
                },
              },
            },
          },
          "400": {
            description: "Missing or invalid message input",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Message is required.",
                },
              },
            },
          },
          "500": {
            description: "RAG pipeline execution error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/vapi/call": {
      post: {
        tags: ["Voice Assistant"],
        summary: "Initiate Outbound AI Voice Counseling Call",
        description: "Dispatches an automated outbound voice call via Vapi to provide spoken admissions guidance.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CallRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Call initiated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CallResponse",
                },
              },
            },
          },
          "400": {
            description: "Missing or invalid phone number",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Valid phone number is required.",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Authenticated user not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token (without 'Bearer ' prefix).",
      },
    },
    schemas: {
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "John Doe" },
          email: { type: "string", format: "email", example: "student@example.com" },
          password: { type: "string", minLength: 6, example: "Password123!" },
          phone: { type: "string", nullable: true, example: "+919876543210" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "student@example.com" },
          password: { type: "string", example: "Password123!" },
        },
      },
      AuthSuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Login successful." },
          data: {
            type: "object",
            properties: {
              token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
              user: {
                type: "object",
                properties: {
                  id: { type: "string", example: "60c72b2f9b1d8b2bad000001" },
                  name: { type: "string", example: "John Doe" },
                  email: { type: "string", example: "student@example.com" },
                  phone: { type: "string", nullable: true, example: "+919876543210" },
                },
              },
            },
          },
        },
      },
      UserProfileResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              user: {
                type: "object",
                properties: {
                  id: { type: "string", example: "60c72b2f9b1d8b2bad000001" },
                  name: { type: "string", example: "John Doe" },
                  email: { type: "string", example: "student@example.com" },
                  phone: { type: "string", nullable: true, example: "+919876543210" },
                  created_at: { type: "string", format: "date-time", example: "2026-11-20T10:00:00.000Z" },
                },
              },
            },
          },
        },
      },
      ChatMessageRequest: {
        type: "object",
        required: ["message"],
        properties: {
          message: {
            type: "string",
            example: "What are the B.Tech CSE eligibility criteria and fee structure?",
          },
        },
      },
      ChatMessageResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              message: {
                type: "string",
                example:
                  "For B.Tech CSE at KKS College, candidates must possess a minimum of 60% in PCM. The annual tuition fee is ₹1,20,000.",
              },
            },
          },
        },
      },
      CallRequest: {
        type: "object",
        required: ["phoneNumber"],
        properties: {
          phoneNumber: { type: "string", example: "+919876543210" },
          preferredCourse: { type: "string", example: "B.Tech Computer Science" },
        },
      },
      CallResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Call initiated. You will receive a call shortly." },
          data: {
            type: "object",
            properties: {
              callId: { type: "string", example: "call_98765fedcba" },
              status: { type: "string", example: "queued" },
            },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error message description." },
        },
      },
    },
  },
};
