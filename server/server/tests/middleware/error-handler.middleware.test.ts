import { describe, it, expect, vi, beforeEach } from "vitest";
import errorHandler from "../../src/middleware/error-handler.middleware.ts";
import type { Request, Response, NextFunction } from "express";

describe("Global Error Handler Middleware (Unit Tests)", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
  });

  it("should return status 500 and default message for generic Error", () => {
    const error = new Error("Something went wrong");
    errorHandler(error, mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Something went wrong",
      })
    );
  });

  it("should honor custom statusCode on AppError", () => {
    const error: any = new Error("Resource not found");
    error.statusCode = 404;

    errorHandler(error, mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Resource not found",
      })
    );
  });

  it("should handle MongoDB duplicate key error (code: 11000) and return 409", () => {
    const error: any = new Error("Duplicate key");
    error.code = 11000;
    error.keyPattern = { email: 1 };

    errorHandler(error, mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "A user with this email already exists.",
      })
    );
  });

  it("should handle Mongoose ValidationError and return 400", () => {
    const error: any = new Error("Validation failed");
    error.name = "ValidationError";

    errorHandler(error, mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Validation failed",
      })
    );
  });
});
