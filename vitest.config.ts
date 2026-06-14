import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", ".next", ".claude"],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
