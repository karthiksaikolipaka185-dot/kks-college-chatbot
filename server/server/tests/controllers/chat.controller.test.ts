import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendMessage } from "../../src/controllers/chat.controller.ts";
import * as ragService from "../../src/services/rag.service.ts";
import type { Request, Response, NextFunction } from "express";

describe("Chat Controller (Unit Tests)", () => {
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

  it("should return 400 if message is missing", async () => {
    mockReq.body = {};
    await sendMessage(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Message is required.",
    });
  });

  it("should return 400 if message is whitespace only", async () => {
    mockReq.body = { message: "    " };
    await sendMessage(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Message is required.",
    });
  });

  it("should return 400 if message is not a string", async () => {
    mockReq.body = { message: 12345 };
    await sendMessage(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Message is required.",
    });
  });

  it("should call getRAGResponse and return 200 with answer", async () => {
    mockReq.body = { message: "What are the B.Tech CSE admission requirements?" };
    const mockAnswer = "B.Tech CSE requires a minimum 60% in PCM and qualified state rank.";
    vi.spyOn(ragService, "getRAGResponse").mockResolvedValue(mockAnswer);

    await sendMessage(mockReq as Request, mockRes as Response, nextFunction);

    expect(ragService.getRAGResponse).toHaveBeenCalledWith(
      "What are the B.Tech CSE admission requirements?"
    );
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: { message: mockAnswer },
    });
  });

  it("should propagate errors to next(error) if getRAGResponse throws", async () => {
    mockReq.body = { message: "Test query" };
    const err = new Error("RAG Pipeline failure");
    vi.spyOn(ragService, "getRAGResponse").mockRejectedValue(err);

    await sendMessage(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith(err);
  });
});
