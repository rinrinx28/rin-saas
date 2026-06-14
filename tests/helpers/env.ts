import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Nạp .env.local vào process.env cho test (Vitest không tự đọc).
export function loadEnv(): void {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // Không có .env.local → test sẽ báo thiếu biến ở dưới
  }
}
