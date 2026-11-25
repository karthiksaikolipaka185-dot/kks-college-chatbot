import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { normalizeIndianPhone, initiateOutboundCall } from "../../src/services/vapi.service.ts";

describe("Vapi Service (Unit Tests)", () => {
  describe("normalizeIndianPhone", () => {
    it("should prefix 10-digit Indian numbers with +91", () => {
      expect(normalizeIndianPhone("9876543210")).toBe("+919876543210");
    });

    it("should prevent duplicate country code for 12-digit numbers starting with 91", () => {
      expect(normalizeIndianPhone("919876543210")).toBe("+919876543210");
    });

    it("should preserve numbers already containing a + prefix", () => {
      expect(normalizeIndianPhone("+919876543210")).toBe("+919876543210");
      expect(normalizeIndianPhone("+14155552671")).toBe("+14155552671");
    });

    it("should strip formatting such as spaces, dashes, and parentheses", () => {
      expect(normalizeIndianPhone("98765-43210")).toBe("+919876543210");
      expect(normalizeIndianPhone("(987) 654 3210")).toBe("+919876543210");
      expect(normalizeIndianPhone("91 98765 43210")).toBe("+919876543210");
    });

    it("should strip leading zeroes and format properly", () => {
      expect(normalizeIndianPhone("09876543210")).toBe("+919876543210");
    });
  });

  describe("initiateOutboundCall", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env.VAPI_API_KEY = "mock-vapi-api-key";
      process.env.VAPI_PHONE_NUMBER_ID = "mock-phone-id";
      process.env.VAPI_ASSISTANT_ID = "mock-assistant-id";
      vi.restoreAllMocks();
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("should throw an error if required Vapi environment variables are missing", async () => {
      delete process.env.VAPI_API_KEY;
      await expect(
        initiateOutboundCall({
          phoneNumber: "9876543210",
          userName: "Test User",
          userEmail: "test@kks.edu",
        })
      ).rejects.toThrow("Vapi configuration missing on server.");
    });

    it("should invoke fetch with correct headers and payload, returning response", async () => {
      const mockResponse = { id: "call_12345", status: "queued" };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await initiateOutboundCall({
        phoneNumber: "9876543210",
        userName: "John Doe",
        userEmail: "john@kks.edu",
        preferredCourse: "B.Tech Computer Science",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.vapi.ai/call");
      expect(options.method).toBe("POST");
      expect(options.headers.Authorization).toBe("Bearer mock-vapi-api-key");

      const body = JSON.parse(options.body);
      expect(body.customer.number).toBe("+919876543210");
      expect(body.customer.name).toBe("John Doe");
      expect(body.assistantOverrides.variableValues.preferredCourse).toBe("B.Tech Computer Science");
      expect(result).toEqual(mockResponse);
    });

    it("should throw an error when Vapi API responds with a non-OK status", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ message: "Invalid phone number" }),
      });
      global.fetch = mockFetch;

      await expect(
        initiateOutboundCall({
          phoneNumber: "9876543210",
          userName: "John Doe",
          userEmail: "john@kks.edu",
        })
      ).rejects.toThrow("Vapi API error (400)");
    });
  });
});
