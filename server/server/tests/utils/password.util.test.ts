import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "../../src/utils/password.util.ts";

describe("Password Utility (Unit Tests)", () => {
  const plainPassword = "StudentSecret123!";

  describe("hashPassword", () => {
    it("should hash a plain password into a bcrypt hash", async () => {
      const hash = await hashPassword(plainPassword);
      expect(hash).not.toBe(plainPassword);
      expect(hash.startsWith("$2")).toBe(true);
      expect(hash.length).toBeGreaterThan(20);
    });

    it("should produce unique hashes for the same password due to random salt", async () => {
      const hash1 = await hashPassword(plainPassword);
      const hash2 = await hashPassword(plainPassword);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("comparePassword", () => {
    it("should return true when the plain password matches the hash", async () => {
      const hash = await hashPassword(plainPassword);
      const isMatch = await comparePassword(plainPassword, hash);
      expect(isMatch).toBe(true);
    });

    it("should return false when the plain password does not match", async () => {
      const hash = await hashPassword(plainPassword);
      const isMatch = await comparePassword("WrongPassword123", hash);
      expect(isMatch).toBe(false);
    });

    it("should return false for empty or invalid password comparison", async () => {
      const hash = await hashPassword(plainPassword);
      const isMatch = await comparePassword("", hash);
      expect(isMatch).toBe(false);
    });
  });
});
