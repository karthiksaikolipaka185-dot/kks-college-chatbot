import { describe, it, expect, vi, beforeEach } from "vitest";
import { startCall } from "../../src/controllers/vapi.controller.ts";
import User from "../../src/models/user.model.ts";
import * as vapiService from "../../src/services/vapi.service.ts";
import type { Request, Response, NextFunction } from "express";

describe("Vapi Controller (Unit Tests)", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      user: { userId: "user_123", email: "student@kks.edu" },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
    vi.restoreAllMocks();
  });

  it("should return 400 if phoneNumber is missing", async () => {
    mockReq.body = { phoneNumber: "" };
    await startCall(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Valid phone number is required.",
    });
  });

  it("should return 400 if phoneNumber is less than 10 characters", async () => {
    mockReq.body = { phoneNumber: "12345" };
    await startCall(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Valid phone number is required.",
    });
  });

  it("should return 404 if user is not found in database", async () => {
    mockReq.body = { phoneNumber: "9876543210" };
    vi.spyOn(User, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as any);

    await startCall(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found.",
    });
  });

  it("should initiate call and return 200 with call details on success", async () => {
    mockReq.body = { phoneNumber: "9876543210", preferredCourse: "CSE" };
    const mockUser = { name: "Karthik", email: "karthik@kks.edu" };
    vi.spyOn(User, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser),
    } as any);
    vi.spyOn(vapiService, "initiateOutboundCall").mockResolvedValue({
      id: "call_abc123",
      status: "queued",
    });

    await startCall(mockReq as Request, mockRes as Response, nextFunction);

    expect(vapiService.initiateOutboundCall).toHaveBeenCalledWith({
      phoneNumber: "9876543210",
      userName: "Karthik",
      userEmail: "karthik@kks.edu",
      preferredCourse: "CSE",
    });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Call initiated. You will receive a call shortly.",
      data: { callId: "call_abc123", status: "queued" },
    });
  });

  it("should call next(error) if initiateOutboundCall throws", async () => {
    mockReq.body = { phoneNumber: "9876543210" };
    vi.spyOn(User, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue({ name: "Karthik", email: "karthik@kks.edu" }),
    } as any);
    const apiError = new Error("Vapi upstream failure");
    vi.spyOn(vapiService, "initiateOutboundCall").mockRejectedValue(apiError);

    await startCall(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith(apiError);
  });
});
