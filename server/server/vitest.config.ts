import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/server.ts",
        "src/config/database.config.ts",
      ],
    },
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./test-results.xml",
    },
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test-jwt-secret-key-at-least-32-chars-long-for-testing",
      JWT_EXPIRES_IN: "7d",
      PORT: "5000",
      DB_NAME: "test_db",
      VECTOR_INDEX_NAME: "test_vector_index",
    },
  },
});
