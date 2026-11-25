import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.ts";

describe("Swagger and Health Routes (API Integration Tests)", () => {
  it("GET /api/health should return 200 and healthy status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("healthy");
    expect(res.body.timestamp).toBeDefined();
  });

  it("GET /api/docs.json should return 200 and valid OpenAPI 3.0 specification", async () => {
    const res = await request(app).get("/api/docs.json");
    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toMatch(/json/);
    expect(res.body.openapi).toBe("3.0.3");
    expect(res.body.info.title).toContain("KKS College");

    // Verify all 6 endpoints are documented
    const paths = Object.keys(res.body.paths);
    expect(paths).toContain("/api/health");
    expect(paths).toContain("/api/auth/register");
    expect(paths).toContain("/api/auth/login");
    expect(paths).toContain("/api/auth/me");
    expect(paths).toContain("/api/chat/message");
    expect(paths).toContain("/api/vapi/call");

    // Verify JWT bearer authorization scheme is defined
    expect(res.body.components.securitySchemes.bearerAuth).toBeDefined();
    expect(res.body.components.securitySchemes.bearerAuth.type).toBe("http");
    expect(res.body.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
  });

  it("GET /api/docs/ should return 200 with Swagger UI HTML interface", async () => {
    const res = await request(app).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });

  it("GET /api/unknown-endpoint should return 404 route not found", async () => {
    const res = await request(app).get("/api/unknown-endpoint");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Route not found.",
    });
  });
});
