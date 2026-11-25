import type { Request, Response, NextFunction } from "express";
import User from "../models/user.model.ts";
import { hashPassword, comparePassword } from "../utils/password.util.ts";
import { generateToken } from "../utils/jwt.util.ts";
import {
  GoogleAuthError,
  buildGoogleAuthUrl,
  createOAuthStateToken,
  exchangeGoogleCode,
  verifyGoogleIdToken,
  verifyOAuthStateToken,
} from "../utils/google-auth.util.ts";
import type { GoogleUserProfile } from "../utils/google-auth.util.ts";

const getAllowedClientOrigins = (): string[] => [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://kks-chatbot-frontend.vercel.app",
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];

const getDefaultClientOrigin = (): string =>
  process.env.CLIENT_URL || "http://localhost:5173";

const resolveClientOrigin = (req: Request): string => {
  const allowed = new Set(getAllowedClientOrigins());
  const requestedOrigin =
    typeof req.query.redirect_origin === "string" ? req.query.redirect_origin : undefined;

  if (requestedOrigin && allowed.has(requestedOrigin)) {
    return requestedOrigin;
  }

  const headerOrigin = req.get("origin");
  if (headerOrigin && allowed.has(headerOrigin)) {
    return headerOrigin;
  }

  const referer = req.get("referer");
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowed.has(refererOrigin)) {
        return refererOrigin;
      }
    } catch {
      // Ignore malformed referer
    }
  }

  return getDefaultClientOrigin();
};

const resolveCallbackUrl = (req: Request): string => {
  if (process.env.GOOGLE_CALLBACK_URL?.trim()) {
    return process.env.GOOGLE_CALLBACK_URL.trim();
  }
  const host = req.get("host") || "localhost:5000";
  return `${req.protocol}://${host}/api/auth/google/callback`;
};

const findOrCreateGoogleUser = async (profile: GoogleUserProfile) => {
  let user = await User.findOne({
    $or: [{ googleId: profile.googleId }, { email: profile.email.toLowerCase() }],
  });

  if (user) {
    let needsSave = false;
    if (!user.googleId) {
      user.googleId = profile.googleId;
      needsSave = true;
    }
    if (!user.avatar && profile.avatar) {
      user.avatar = profile.avatar;
      needsSave = true;
    }
    if (needsSave) {
      await user.save();
    }
  } else {
    user = await User.create({
      name: profile.name,
      email: profile.email.toLowerCase(),
      googleId: profile.googleId,
      avatar: profile.avatar || null,
      authProvider: "google",
    });
  }

  const token = generateToken({ userId: user._id.toString(), email: user.email });

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      avatar: user.avatar ?? null,
    },
  };
};

// ROUTE: POST /api/auth/register
// ACCESS: Public — anyone can hit this
// PURPOSE: Create a brand new user account in MongoDB
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: "Name, email, and password are required." });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ success: false, message: "An account with this email already exists." });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || null,
    });

    const token = generateToken({ userId: user._id.toString(), email: user.email });

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
      },
    });
  } catch (error) {
    next(error);
  }
};


// ROUTE: POST /api/auth/login
// ACCESS: Public — anyone can hit this
// PURPOSE: Verify credentials and return a JWT
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: "Email and password are required." });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ success: false, message: "Invalid email or password." });
      return;
    }

    if (!user.password) {
      res.status(401).json({
        success: false,
        message: "This account uses Google Sign-In. Please sign in with Google.",
      });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: "Invalid email or password." });
      return;
    }

    const token = generateToken({ userId: user._id.toString(), email: user.email });

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ROUTE: GET /api/auth/google/config
// ACCESS: Public
// PURPOSE: Expose the public Google OAuth Client ID to the frontend
export const getGoogleConfig = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      clientId: process.env.GOOGLE_CLIENT_ID?.trim() || null,
    },
  });
};

// ROUTE: POST /api/auth/google
// ACCESS: Public
// PURPOSE: Authenticate or register a user via Google OAuth authorization code or ID token
export const googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, credential, redirectUri } = req.body as {
      code?: string;
      credential?: string;
      redirectUri?: string;
    };

    if (!code && !credential) {
      res.status(400).json({
        success: false,
        message: "Google authorization code or credential is required.",
      });
      return;
    }

    const profile = code
      ? await exchangeGoogleCode(code, redirectUri || "postmessage")
      : await verifyGoogleIdToken(credential as string);

    const authResult = await findOrCreateGoogleUser(profile);

    res.status(200).json({
      success: true,
      message: "Google authentication successful.",
      data: authResult,
    });
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

// ROUTE: GET /api/auth/google
// ACCESS: Public
// PURPOSE: Initiate redirect-based Google OAuth 2.0 flow
export const googleAuthRedirect = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const clientOrigin = resolveClientOrigin(req);
    const callbackUrl = resolveCallbackUrl(req);
    const state = createOAuthStateToken(clientOrigin);
    const authUrl = buildGoogleAuthUrl(callbackUrl, state);

    res.redirect(authUrl);
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

// ROUTE: GET /api/auth/google/callback
// ACCESS: Public
// PURPOSE: Handle Google OAuth 2.0 callback, exchange code for tokens, and redirect back to client
export const googleAuthCallback = async (req: Request, res: Response): Promise<void> => {
  let clientOrigin = getDefaultClientOrigin();

  try {
    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    if (state) {
      const stateData = verifyOAuthStateToken(state);
      if (new Set(getAllowedClientOrigins()).has(stateData.origin)) {
        clientOrigin = stateData.origin;
      }
    } else {
      throw new GoogleAuthError(400, "Missing OAuth state parameter.");
    }

    if (error) {
      throw new GoogleAuthError(401, "Google sign-in was cancelled or denied.");
    }

    if (!code) {
      throw new GoogleAuthError(400, "Missing Google authorization code.");
    }

    const callbackUrl = resolveCallbackUrl(req);
    const profile = await exchangeGoogleCode(code, callbackUrl);
    const { token } = await findOrCreateGoogleUser(profile);

    res.redirect(`${clientOrigin}/auth/google/callback#token=${encodeURIComponent(token)}`);
  } catch (err) {
    const message =
      err instanceof GoogleAuthError
        ? err.message
        : "Google authentication failed. Please try again.";
    res.redirect(`${clientOrigin}/login?error=${encodeURIComponent(message)}`);
  }
};

// ROUTE: GET /api/auth/me
// ACCESS: PROTECTED — requires valid JWT in Authorization header
// PURPOSE: Return the currently logged-in user's profile data
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = (req as any).user;

    if (!currentUser) {
      res.status(401).json({ success: false, message: "Not authenticated." });
      return;
    }

    const user = await User.findById(currentUser.userId).select("-password");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          ...(user.avatar ? { avatar: user.avatar } : {}),
          created_at: user.created_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
