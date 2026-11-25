import crypto from "crypto";
import jwt from "jsonwebtoken";

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

export class GoogleAuthError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "GoogleAuthError";
    this.statusCode = statusCode;
  }
}

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenInfo {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  aud?: string;
  iss?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

interface OAuthStatePayload {
  nonce: string;
  origin: string;
  purpose: "google_oauth_state";
}

const VALID_GOOGLE_ISSUERS = new Set([
  "accounts.google.com",
  "https://accounts.google.com",
]);

/**
 * Reads and validates Google OAuth credentials from environment variables.
 */
export const getGoogleOAuthConfig = (): { clientId: string; clientSecret: string } => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new GoogleAuthError(
      500,
      "Google authentication is not configured on the server.",
    );
  }

  return { clientId, clientSecret };
};

const normalizeGoogleProfile = (data: {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
}): GoogleUserProfile => {
  const isVerified = data.email_verified === true || data.email_verified === "true";

  if (!data.sub || !data.email || !isVerified) {
    throw new GoogleAuthError(
      401,
      "Google account must have a verified email address.",
    );
  }

  const fallbackName = data.email.split("@")[0] || "KKS Student";
  const profile: GoogleUserProfile = {
    googleId: data.sub,
    email: data.email.toLowerCase(),
    name: data.name?.trim() || fallbackName,
  };

  if (data.picture) {
    profile.avatar = data.picture;
  }

  return profile;
};

/**
 * Verifies a Google ID token using Google's tokeninfo endpoint.
 */
export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleUserProfile> => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new GoogleAuthError(
      500,
      "Google authentication is not configured on the server.",
    );
  }

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const response = await fetch(url);
  const payload = (await response.json()) as GoogleTokenInfo;

  if (!response.ok) {
    throw new GoogleAuthError(
      401,
      payload.error_description || "Invalid or expired Google credential.",
    );
  }

  if (payload.aud !== clientId) {
    throw new GoogleAuthError(401, "Google token audience mismatch.");
  }

  if (payload.iss && !VALID_GOOGLE_ISSUERS.has(payload.iss)) {
    throw new GoogleAuthError(401, "Invalid Google token issuer.");
  }

  return normalizeGoogleProfile(payload);
};

/**
 * Exchanges a Google OAuth authorization code for tokens and returns the verified user profile.
 */
export const exchangeGoogleCode = async (
  code: string,
  redirectUri: string,
): Promise<GoogleUserProfile> => {
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

  if (!tokenResponse.ok) {
    throw new GoogleAuthError(
      401,
      tokenData.error_description || tokenData.error || "Failed to verify Google authorization code.",
    );
  }

  if (tokenData.id_token) {
    return verifyGoogleIdToken(tokenData.id_token);
  }

  if (!tokenData.access_token) {
    throw new GoogleAuthError(401, "Google did not return an identity token.");
  }

  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userInfoResponse.ok) {
    throw new GoogleAuthError(401, "Failed to retrieve Google user profile.");
  }

  const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;
  return normalizeGoogleProfile(userInfo);
};

/**
 * Builds the Google OAuth 2.0 consent screen URL for redirect-based sign-in.
 */
export const buildGoogleAuthUrl = (redirectUri: string, state: string): string => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new GoogleAuthError(
      500,
      "Google authentication is not configured on the server.",
    );
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("state", state);

  return authUrl.toString();
};

/**
 * Creates a short-lived signed state token for CSRF protection during OAuth redirects.
 */
export const createOAuthStateToken = (origin: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new GoogleAuthError(500, "JWT_SECRET is not defined in environment variables.");
  }

  const payload: OAuthStatePayload = {
    nonce: crypto.randomBytes(16).toString("hex"),
    origin,
    purpose: "google_oauth_state",
  };

  return jwt.sign(payload, secret, { expiresIn: "10m" });
};

/**
 * Verifies the signed OAuth state token and returns the validated client origin.
 */
export const verifyOAuthStateToken = (state: string): { origin: string } => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new GoogleAuthError(500, "JWT_SECRET is not defined in environment variables.");
  }

  try {
    const decoded = jwt.verify(state, secret) as Partial<OAuthStatePayload>;
    if (decoded.purpose !== "google_oauth_state" || !decoded.origin) {
      throw new GoogleAuthError(400, "Invalid OAuth state parameter.");
    }
    return { origin: decoded.origin };
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      throw error;
    }
    throw new GoogleAuthError(400, "Expired or invalid OAuth state parameter.");
  }
};
