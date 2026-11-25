import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateGroqConfig, getRAGResponse } from "../../src/services/rag.service.ts";

describe("RAG Service (Unit Tests)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("validateGroqConfig", () => {
    it("should throw error if GROQ_API_KEY is missing", async () => {
      delete process.env.GROQ_API_KEY;
      await expect(validateGroqConfig()).rejects.toThrow(
        "GROQ_API_KEY is missing or invalid in environment variables."
      );
    });

    it("should throw error if GROQ_API_KEY is the placeholder value", async () => {
      process.env.GROQ_API_KEY = "gsk_your_groq_api_key_here";
      await expect(validateGroqConfig()).rejects.toThrow(
        "GROQ_API_KEY is missing or invalid in environment variables."
      );
    });

    it("should throw error if GROQ_API_KEY does not start with 'gsk_'", async () => {
      process.env.GROQ_API_KEY = "invalid_prefix_key";
      await expect(validateGroqConfig()).rejects.toThrow(
        "GROQ_API_KEY is missing or invalid in environment variables."
      );
    });

    it("should throw error if Groq API returns non-OK response", async () => {
      process.env.GROQ_API_KEY = "gsk_mock_valid_key_for_testing";
      process.env.GROQ_MODEL = "openai/gpt-oss-120b";

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(validateGroqConfig()).rejects.toThrow("Groq API returned HTTP 401");
    });

    it("should throw error if configured GROQ_MODEL is not in available models list", async () => {
      process.env.GROQ_API_KEY = "gsk_mock_valid_key_for_testing";
      process.env.GROQ_MODEL = "unsupported-model-x";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: "llama-3.1-8b-instant" }, { id: "mixtral-8x7b-32768" }],
        }),
      });

      await expect(validateGroqConfig()).rejects.toThrow(
        "Configured Groq model 'unsupported-model-x' is not accessible"
      );
    });
  });

  describe("getRAGResponse fallback", () => {
    it("should catch errors gracefully and return the user-friendly fallback message", async () => {
      delete process.env.GROQ_API_KEY;
      const response = await getRAGResponse("What is the fee structure?");
      expect(response).toBe(
        "I'm having trouble right now. Please try again or click 'Talk to Us'."
      );
    });
  });
});
