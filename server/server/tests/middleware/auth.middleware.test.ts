import { describe, it, expect, vi, beforeEach } from "vitest";
import authMiddleware from "../../src/middleware/auth.middleware.ts";
import * as jwtUtil from "../../src/utils/jwt.util.ts";
import type { Request, Response, NextFunction } from "express";

describe("Auth Middleware (Unit Tests)", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
    vi.restoreAllMocks();
  });

  it("should return 401 if Authorization header is missing", () => {
    mockReq.headers = {};
    authMiddleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. No token provided.",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should return 401 if Authorization header does not start with 'Bearer '", () => {
    mockReq.headers = { authorization: "Basic some_auth_credentials" };
    authMiddleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. No token provided.",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should return 401 if token is empty after 'Bearer '", () => {
    mockReq.headers = { authorization: "Bearer " };
    authMiddleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. Token is empty.",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should attach decoded user to req.user and call next() on valid token", () => {
    const mockUser: jwtUtil.JWTPayload = {
      userId: "user_12345",
      email: "student@kks.edu",
    };
    vi.spyOn(jwtUtil, "verifyToken").mockReturnValue(mockUser);

    mockReq.headers = { authorization: "Bearer valid.jwt.token" };
    authMiddleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(jwtUtil.verifyToken).toHaveBeenCalledWith("valid.jwt.token");
    expect((mockReq as any).user).toEqual(mockUser);
    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it("should return 401 when token has expired (TokenExpiredError)", () => {
    const expiredError = new Error("jwt expired");
    expiredError.name = "TokenExpiredError";
    vi.spyOn(jwtUtil, "verifyToken").mockImplementation(() => {
      throw expiredError;
    });

    mockReq.headers = { authorization: "Bearer expired.jwt.token" };
    authMiddleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Token has expired. Please log in again.",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should return 401 when token is malformed (JsonWebTokenError)", () => {
    const jwtError = new Error("invalid signature");
    jwtError.name = "JsonWebTokenError";
    vi.spyOn(jwtUtil, "verifyToken").mockImplementation(() => {
      throw jwtError;
    });

    mockReq.headers = { authorization: "Bearer malformed.jwt.token" };
    authMiddleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid token. Please log in again.",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should return 500 when an unexpected verification error occurs", () => {
    vi.spyOn(jwtUtil, "verifyToken").mockImplementation(() => {
      throw "Unknown error string";
    });

    mockReq.headers = { authorization: "Bearer token.with.unknown.error" };
    authMiddleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Authentication failed.",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
