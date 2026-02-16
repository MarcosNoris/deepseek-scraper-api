import { chromium } from "playwright";
import fs from "fs";
import { AUTH_FILE,
  CHAT_URL_FILE,
  SELECTORS,
  CONFIG,
  SYSTEM_PROMPT_FILE,
  ACTUAL_TOOLS
} from "../config/constants.js";
import { getTime } from "../tools/getTime.js";

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
      await this.browser.close();
      this.browser = null;
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

    await this.page.goto(targetUrl, {timeout: 120_000});
    await this.page.waitForSelector(SELECTORS.TEXTAREA, { timeout: 60000 });

    this.isReady = true;
    console.log("✅ [DeepSeekService] Browser ready.");

    // Send system prompt as the first message
    const systemPrompt = fs.readFileSync(SYSTEM_PROMPT_FILE, "utf-8");
    console.log("📨 [DeepSeekService] Sending system prompt...");
    await this.sendMessage(systemPrompt, true);
    console.log("✅ [DeepSeekService] System prompt sent successfully.");
  }

  async sendMessage(text, skipTools = false) {
    if (this.isProcessing) {
      throw new Error("BUSY");
    }
    this.isProcessing = true;

    try {
      const previousCount = await this.page
        .locator(SELECTORS.RESPONSE_BLOCK)
        .count();

      const messageToSend = skipTools ? text : this.#concat_text_with_available_tools(text, []);
      await this.page.fill(SELECTORS.TEXTAREA, messageToSend);
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

  ProccessAIResponse(response){

    const parsedResponse = JSON.parse(response)

    return {
      message: parsedResponse.msg,
      tool: parsedResponse.tool,
      finish_reason: parsedResponse.finish_reason
    }
  }

  async ProcessUserMessage(content){
    const keys = Object.keys(content)
    if(!keys.includes('tools') || !keys.includes('message') || !keys.includes('model')){
      throw new Error('Invalid message format')
    }
    const { tools, message, model } = content;

    if(message.role === 'user'){
      const messageToSend = this.#concat_text_with_available_tools(message.content, tools);
      const response = await this.sendMessage(messageToSend);
      return this.ProccessAIResponse(response);
    }else if(message.role === 'tool'){
      if(!message.function_name){
        throw new Error('Invalid message format')
      }
      const toolResponse = this.#concat_text_with_tool_response(message, tools);
      const response = await this.sendMessage(toolResponse);
      return this.ProccessAIResponse(response);
    }

  }

  #concat_text_with_available_tools(text, tools){
    const fullText = `
      [AVAILABLE_TOOLS]
      ${tools.map(tool => `- NAME: ${tool.name}
      - DESCRIPTION: ${tool.description}
      - ARGUMENTS: ${JSON.stringify(tool.args)}
      - REQUIRED_ARGS: ${JSON.stringify(tool.required_args)}

                             `).join('\n')}
      [USER_QUERY]
       ${text}
    `
    return fullText;
  }

  #concat_text_with_tool_response(toolResponse, tools){
    const fullText = `
      [AVAILABLE_TOOLS]
        ${tools.map(tool => `* ${tool.name}: ${tool.description}`).join('\n')}
      [TOOL_RESPONSE]
        ${toolResponse.function_name}
        ${toolResponse.content}
    `
    return fullText;
  }

  #execute_tool(toolName, args){
    if(!ACTUAL_TOOLS.includes(toolName))
      throw new Error(`Tool ${toolName} not found`);

    const response = {
      name: '',
      res: ''
    }

    switch(toolName){
      case 'get_time':
        response.name = toolName;
        response.res = getTime()
        break
    }

    return response
  }
}

export const deepSeekService = new DeepSeekService();
