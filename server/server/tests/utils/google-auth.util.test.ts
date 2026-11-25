import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GoogleAuthError,
  buildGoogleAuthUrl,
  createOAuthStateToken,
  exchangeGoogleCode,
  getGoogleOAuthConfig,
  verifyGoogleIdToken,
  verifyOAuthStateToken,
} from "../../src/utils/google-auth.util.ts";

describe("Google Auth Utility (Unit Tests)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.JWT_SECRET = "test-jwt-secret";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("getGoogleOAuthConfig throws 500 when credentials are missing", () => {
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(() => getGoogleOAuthConfig()).toThrow(GoogleAuthError);
  });

  it("verifyGoogleIdToken validates aud and email_verified", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: "sub-123",
        email: "Student@KKS.edu",
        email_verified: "true",
        name: "Student One",
        picture: "https://example.com/photo.jpg",
        aud: "test-client-id.apps.googleusercontent.com",
        iss: "https://accounts.google.com",
      }),
    } as Response);

    const profile = await verifyGoogleIdToken("valid-id-token");

    expect(profile).toEqual({
      googleId: "sub-123",
      email: "student@kks.edu",
      name: "Student One",
      avatar: "https://example.com/photo.jpg",
    });
  });

  it("verifyGoogleIdToken rejects mismatched audience", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: "sub-123",
        email: "student@kks.edu",
        email_verified: "true",
        aud: "other-client-id",
      }),
    } as Response);

    await expect(verifyGoogleIdToken("bad-aud-token")).rejects.toThrow("audience mismatch");
  });

  it("exchangeGoogleCode posts code with client_id and client_secret and verifies id_token", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access-123",
          id_token: "id-token-123",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: "sub-999",
          email: "user@kks.edu",
          email_verified: "true",
          name: "OAuth User",
          aud: "test-client-id.apps.googleusercontent.com",
        }),
      } as Response);

    const profile = await exchangeGoogleCode("auth-code-xyz", "postmessage");

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
    expect(profile.googleId).toBe("sub-999");
    expect(profile.email).toBe("user@kks.edu");
  });

  it("buildGoogleAuthUrl constructs Google OAuth consent URL", () => {
    const url = new URL(buildGoogleAuthUrl("http://localhost:5000/api/auth/google/callback", "state-123"));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-client-id.apps.googleusercontent.com");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:5000/api/auth/google/callback");
    expect(url.searchParams.get("state")).toBe("state-123");
  });

  it("createOAuthStateToken and verifyOAuthStateToken round-trip origin", () => {
    const token = createOAuthStateToken("http://localhost:5173");
    expect(verifyOAuthStateToken(token)).toEqual({ origin: "http://localhost:5173" });
    expect(() => verifyOAuthStateToken("invalid-token")).toThrow(GoogleAuthError);
  });
});
