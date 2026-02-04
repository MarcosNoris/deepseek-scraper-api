import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_PATH = path.join(__dirname, "../storage");
const AUTH_FILE = path.join(STORAGE_PATH, "auth.json");

if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH);
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("🔹 Navigating to DeepSeek. Log in MANUALLY...");

  await page.goto("https://chat.deepseek.com/");

  await page.waitForTimeout(60000);

  await context.storageState({ path: AUTH_FILE });
  console.log(`✅ Session saved to: ${AUTH_FILE}`);

  await browser.close();
})();
