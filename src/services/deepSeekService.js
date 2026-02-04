import { chromium } from "playwright";
import fs from "fs";
import {
  AUTH_FILE,
  CHAT_URL_FILE,
  SELECTORS,
  CONFIG,
} from "../config/constants.js";

class DeepSeekService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isReady = false;
    this.isProcessing = false;
  }

  async authenticate(email, password) {
    console.log("🔹 [DeepSeekService] Starting authentication...");

    if (this.browser) {
      await this.browser.close();
    }

    this.browser = await chromium.launch({
      headless: CONFIG.HEADLESS,
      args: ["--start-maximized"],
    });

    const context = await this.browser.newContext();
    this.page = await context.newPage();

    await this.page.goto("https://chat.deepseek.com/");

    await this.page.waitForTimeout(2000);

    const loginButton = this.page.locator(
      'button:has-text("Log in"), a:has-text("Log in"), text=Log in',
    );
    if (await loginButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginButton.click();
      await this.page.waitForTimeout(2000);
    }

    await this.page
      .getByPlaceholder("Phone number / email address")
      .fill(email);

    await this.page.waitForTimeout(500);

    await this.page.getByRole("textbox", { name: "Password" }).fill(password);
    await this.page.waitForTimeout(500);

    await this.page.getByRole("button", { name: "Log in" }).click();

    await this.page.waitForTimeout(5000);

    const loginSuccess = await this.page
      .waitForSelector(SELECTORS.TEXTAREA, { timeout: 60000 })
      .then(() => true)
      .catch(() => false);

    if (loginSuccess) {
      await context.storageState({ path: AUTH_FILE });
      console.log(
        `✅ [DeepSeekService] Authentication successful. Session saved.`,
      );
      return true;
    } else {
      await this.browser.close();
      this.browser = null;
      throw new Error(
        "Authentication failed - could not find chat interface after login",
      );
    }
  }

  async init() {
    this.browser = await chromium.launch({
      headless: CONFIG.HEADLESS,
      args: ["--start-maximized"],
    });

    const context = await this.browser.newContext({ storageState: AUTH_FILE });
    this.page = await context.newPage();

    let targetUrl = "https://chat.deepseek.com/";
    if (fs.existsSync(CHAT_URL_FILE)) {
      const savedUrl = fs.readFileSync(CHAT_URL_FILE, "utf-8").trim();
      if (savedUrl.includes("chat.deepseek.com")) targetUrl = savedUrl;
    }

    await this.page.goto(targetUrl);
    await this.page.waitForSelector(SELECTORS.TEXTAREA, { timeout: 60000 });

    this.isReady = true;
    console.log("✅ [DeepSeekService] Browser ready.");
  }

  async sendMessage(text) {
    if (this.isProcessing) {
      throw new Error("BUSY");
    }
    this.isProcessing = true;

    try {
      const previousCount = await this.page
        .locator(SELECTORS.RESPONSE_BLOCK)
        .count();

      await this.page.fill(SELECTORS.TEXTAREA, text);
      await this.page.waitForTimeout(300);
      await this.page.locator(SELECTORS.TEXTAREA).press("Enter");

      const currentUrl = this.page.url();
      fs.writeFileSync(CHAT_URL_FILE, currentUrl);

      await this.page.waitForFunction(
        (args) => document.querySelectorAll(args[0]).length > args[1],
        [SELECTORS.RESPONSE_BLOCK, previousCount],
        { timeout: 60000 },
      );

      const lastResponseLocator = this.page
        .locator(SELECTORS.RESPONSE_BLOCK)
        .last();
      let prevText = "";
      let steadyCount = 0;

      while (true) {
        const currentText = await lastResponseLocator.innerText();

        if (currentText === prevText && currentText.length > 0) steadyCount++;
        else steadyCount = 0;

        if (steadyCount >= CONFIG.STABILITY_COUNT) break;

        prevText = currentText;
        await this.page.waitForTimeout(CONFIG.POLLING_INTERVAL);
      }

      return prevText;
    } catch (error) {
      console.error("❌ [DeepSeekService] Error:", error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }
}

export const deepSeekService = new DeepSeekService();
