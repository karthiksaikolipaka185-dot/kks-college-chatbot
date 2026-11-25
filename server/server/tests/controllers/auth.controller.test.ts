import { describe, it, expect, vi, beforeEach } from "vitest";
import { register, login, getMe, getGoogleConfig, googleAuth } from "../../src/controllers/auth.controller.ts";
import User from "../../src/models/user.model.ts";
import * as passwordUtil from "../../src/utils/password.util.ts";
import * as jwtUtil from "../../src/utils/jwt.util.ts";
import * as googleAuthUtil from "../../src/utils/google-auth.util.ts";
import type { Request, Response, NextFunction } from "express";

describe("Auth Controller (Unit Tests)", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
    vi.restoreAllMocks();
  });

  describe("register", () => {
    it("should return 400 if required fields are missing", async () => {
      mockReq.body = { name: "John" };
      await register(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Name, email, and password are required.",
      });
    });

    it("should return 400 if password length is less than 6 characters", async () => {
      mockReq.body = { name: "John", email: "john@kks.edu", password: "123" };
      await register(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    });

    it("should return 409 if user with email already exists", async () => {
      mockReq.body = { name: "John", email: "existing@kks.edu", password: "password123" };
      vi.spyOn(User, "findOne").mockResolvedValue({ id: "user_1" } as any);

      await register(mockReq as Request, mockRes as Response, nextFunction);

      expect(User.findOne).toHaveBeenCalledWith({ email: "existing@kks.edu" });
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "An account with this email already exists.",
      });
    });

    it("should create user, hash password, generate token, and return 201 on success", async () => {
      mockReq.body = { name: "John Doe", email: "new@kks.edu", password: "securePassword123" };
      vi.spyOn(User, "findOne").mockResolvedValue(null);
      vi.spyOn(passwordUtil, "hashPassword").mockResolvedValue("hashed_password_abc");
      vi.spyOn(User, "create").mockResolvedValue({
        _id: "user_new_123",
        name: "John Doe",
        email: "new@kks.edu",
        password: "hashed_password_abc",
        phone: null,
      } as any);
      vi.spyOn(jwtUtil, "generateToken").mockReturnValue("jwt_token_sample");

      await register(mockReq as Request, mockRes as Response, nextFunction);

      expect(passwordUtil.hashPassword).toHaveBeenCalledWith("securePassword123");
      expect(User.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Account created successfully.",
        data: {
          token: "jwt_token_sample",
          user: {
            id: "user_new_123",
            name: "John Doe",
            email: "new@kks.edu",
            phone: null,
          },
        },
      });
    });

    it("should call next(error) if database throws an exception", async () => {
      mockReq.body = { name: "John", email: "test@kks.edu", password: "password123" };
      const dbError = new Error("Database connection dropped");
      vi.spyOn(User, "findOne").mockRejectedValue(dbError);

      await register(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(dbError);
    });
  });

  describe("login", () => {
    it("should return 400 if email or password is missing", async () => {
      mockReq.body = { email: "student@kks.edu" };
      await login(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Email and password are required.",
      });
    });

    it("should return 401 if user is not found", async () => {
      mockReq.body = { email: "nonexistent@kks.edu", password: "password123" };
      vi.spyOn(User, "findOne").mockResolvedValue(null);

      await login(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password.",
      });
    });

    it("should return 401 if password does not match", async () => {
      mockReq.body = { email: "student@kks.edu", password: "wrongPassword" };
      vi.spyOn(User, "findOne").mockResolvedValue({
        _id: "user_123",
        email: "student@kks.edu",
        password: "hashed_db_password",
      } as any);
      vi.spyOn(passwordUtil, "comparePassword").mockResolvedValue(false);

      await login(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password.",
      });
    });

    it("should return 200 with token and user details on valid login", async () => {
      mockReq.body = { email: "student@kks.edu", password: "validPassword123" };
      vi.spyOn(User, "findOne").mockResolvedValue({
        _id: "user_123",
        name: "Student Name",
        email: "student@kks.edu",
        phone: "+919876543210",
        password: "hashed_db_password",
      } as any);
      vi.spyOn(passwordUtil, "comparePassword").mockResolvedValue(true);
      vi.spyOn(jwtUtil, "generateToken").mockReturnValue("signed_jwt_token");

      await login(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Login successful.",
        data: {
          token: "signed_jwt_token",
          user: {
            id: "user_123",
            name: "Student Name",
            email: "student@kks.edu",
            phone: "+919876543210",
          },
        },
      });
    });
  });

  describe("getMe", () => {
    it("should return 401 if currentUser is not attached to req", async () => {
      (mockReq as any).user = undefined;
      await getMe(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Not authenticated.",
      });
    });

    it("should return 404 if user is not found in database", async () => {
      (mockReq as any).user = { userId: "user_404" };
      vi.spyOn(User, "findById").mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      } as any);

      await getMe(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found.",
      });
    });

    it("should return 200 with user profile when found", async () => {
      (mockReq as any).user = { userId: "user_200" };
      const mockProfile = {
        _id: "user_200",
        name: "Alice",
        email: "alice@kks.edu",
        phone: "+919876543210",
        created_at: new Date(),
      };
      vi.spyOn(User, "findById").mockReturnValue({
        select: vi.fn().mockResolvedValue(mockProfile),
      } as any);

      await getMe(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: "user_200",
            name: "Alice",
            email: "alice@kks.edu",
            phone: "+919876543210",
            created_at: mockProfile.created_at,
          },
        },
      });
    });
  });

  describe("login (Google-only account)", () => {
    it("should return 401 prompting Google Sign-In if user has no local password", async () => {
      mockReq.body = { email: "googleuser@kks.edu", password: "somePassword" };
      vi.spyOn(User, "findOne").mockResolvedValue({
        _id: "user_google_1",
        email: "googleuser@kks.edu",
        authProvider: "google",
      } as any);

      await login(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "This account uses Google Sign-In. Please sign in with Google.",
      });
    });
  });

  describe("getGoogleConfig", () => {
    it("should return configured GOOGLE_CLIENT_ID", () => {
      const prev = process.env.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = "test-google-client-id";

      getGoogleConfig(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { clientId: "test-google-client-id" },
      });

      process.env.GOOGLE_CLIENT_ID = prev;
    });
  });

  describe("googleAuth", () => {
    it("should return 400 if neither code nor credential is provided", async () => {
      mockReq.body = {};
      await googleAuth(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Google authorization code or credential is required.",
      });
    });

    it("should exchange authorization code, create new user, and return 200 with JWT", async () => {
      mockReq.body = { code: "oauth-auth-code" };
      vi.spyOn(googleAuthUtil, "exchangeGoogleCode").mockResolvedValue({
        googleId: "google-sub-123",
        email: "newgoogle@kks.edu",
        name: "Google Student",
        avatar: "https://example.com/avatar.png",
      });
      vi.spyOn(User, "findOne").mockResolvedValue(null);
      vi.spyOn(User, "create").mockResolvedValue({
        _id: "user_g_123",
        name: "Google Student",
        email: "newgoogle@kks.edu",
        phone: null,
        avatar: "https://example.com/avatar.png",
      } as any);
      vi.spyOn(jwtUtil, "generateToken").mockReturnValue("jwt_google_token");

      await googleAuth(mockReq as Request, mockRes as Response, nextFunction);

      expect(googleAuthUtil.exchangeGoogleCode).toHaveBeenCalledWith("oauth-auth-code", "postmessage");
      expect(User.create).toHaveBeenCalledWith({
        name: "Google Student",
        email: "newgoogle@kks.edu",
        googleId: "google-sub-123",
        avatar: "https://example.com/avatar.png",
        authProvider: "google",
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Google authentication successful.",
        data: {
          token: "jwt_google_token",
          user: {
            id: "user_g_123",
            name: "Google Student",
            email: "newgoogle@kks.edu",
            phone: null,
            avatar: "https://example.com/avatar.png",
          },
        },
      });
    });

    it("should link Google account to existing user by email and return 200", async () => {
      mockReq.body = { credential: "google-id-token" };
      const saveMock = vi.fn().mockResolvedValue(undefined);
      const existingUser = {
        _id: "user_existing_1",
        name: "Existing User",
        email: "existing@kks.edu",
        phone: "+919999999999",
        googleId: undefined,
        avatar: null,
        save: saveMock,
      };

      vi.spyOn(googleAuthUtil, "verifyGoogleIdToken").mockResolvedValue({
        googleId: "google-sub-999",
        email: "existing@kks.edu",
        name: "Existing User",
        avatar: "https://example.com/pic.png",
      });
      vi.spyOn(User, "findOne").mockResolvedValue(existingUser as any);
      vi.spyOn(jwtUtil, "generateToken").mockReturnValue("jwt_linked_token");

      await googleAuth(mockReq as Request, mockRes as Response, nextFunction);

      expect(existingUser.googleId).toBe("google-sub-999");
      expect(existingUser.avatar).toBe("https://example.com/pic.png");
      expect(saveMock).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Google authentication successful.",
        data: {
          token: "jwt_linked_token",
          user: {
            id: "user_existing_1",
            name: "Existing User",
            email: "existing@kks.edu",
            phone: "+919999999999",
            avatar: "https://example.com/pic.png",
          },
        },
      });
    });

    it("should return GoogleAuthError status code when verification fails", async () => {
      mockReq.body = { code: "bad-code" };
      vi.spyOn(googleAuthUtil, "exchangeGoogleCode").mockRejectedValue(
        new googleAuthUtil.GoogleAuthError(401, "Invalid Google code."),
      );

      await googleAuth(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Google code.",
      });
    });
  });
});
