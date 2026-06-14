import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve alias "@/..." như tsconfig để test import được lib dùng "@/".
  resolve: {
    alias: { "@": resolve(process.cwd(), ".") },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", ".next", ".claude"],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
