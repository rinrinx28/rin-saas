import { chromium } from "playwright";

const BASE = "http://localhost:3995";
const OUT = "/tmp/shots";
import { mkdirSync } from "node:fs";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(path, name, { dark = false, width = 1440, height = 900 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  if (dark) {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  }
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForSelector("h1");
  await page.waitForTimeout(700); // chờ font + entrance
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
}

await shot("/login", "login-light");
await shot("/login", "login-dark", { dark: true });
await shot("/register", "register-light");
await shot("/login", "login-mobile", { width: 390, height: 780 });

await browser.close();
console.log("done");
