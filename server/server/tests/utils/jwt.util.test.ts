import { describe, it, expect, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import { generateToken, verifyToken, type JWTPayload } from "../../src/utils/jwt.util.ts";

describe("JWT Utility (Unit Tests)", () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalExpiresIn = process.env.JWT_EXPIRES_IN;
  const mockPayload: JWTPayload = {
    userId: "60c72b2f9b1d8b2bad000001",
    email: "student@kks.edu",
  };

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key-1234567890";
    process.env.JWT_EXPIRES_IN = "1h";
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
    process.env.JWT_EXPIRES_IN = originalExpiresIn;
  });

  describe("generateToken", () => {
    it("should generate a valid JWT string when JWT_SECRET is provided", () => {
      const token = generateToken(mockPayload);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);

      const decoded = jwt.decode(token) as JWTPayload;
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it("should use default expiration of '7d' if JWT_EXPIRES_IN is unset", () => {
      delete process.env.JWT_EXPIRES_IN;
      const token = generateToken(mockPayload);
      const decoded = jwt.decode(token) as any;
      expect(decoded.exp).toBeDefined();
    });

    it("should throw an error if JWT_SECRET is undefined", () => {
      delete process.env.JWT_SECRET;
      expect(() => generateToken(mockPayload)).toThrow(
        "JWT_SECRET is not defined in environment variables"
      );
    });
  });

  describe("verifyToken", () => {
    it("should successfully verify and decode a valid token", () => {
      const token = generateToken(mockPayload);
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it("should throw an error for an invalid/tampered token", () => {
      expect(() => verifyToken("invalid.token.structure")).toThrow();
    });

    it("should throw an error when token signature is signed with another secret", () => {
      const forgedToken = jwt.sign(mockPayload, "wrong-secret-key");
      expect(() => verifyToken(forgedToken)).toThrow();
    });

    it("should throw an error for an expired token", () => {
      const expiredToken = jwt.sign(mockPayload, process.env.JWT_SECRET!, {
        expiresIn: "-1s",
      });
      expect(() => verifyToken(expiredToken)).toThrow();
    });

    it("should throw an error if JWT_SECRET is undefined during verification", () => {
      const token = generateToken(mockPayload);
      delete process.env.JWT_SECRET;
      expect(() => verifyToken(token)).toThrow(
        "JWT_SECRET is not defined in environment variables"
      );
    });
  });
});
