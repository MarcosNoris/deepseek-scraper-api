import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STORAGE_PATH = path.join(__dirname, "../../storage");
export const STORAGE_STORAGE = STORAGE_PATH;
export const AUTH_FILE = path.join(STORAGE_PATH, "auth.json");
export const CHAT_URL_FILE = path.join(STORAGE_STORAGE, "last_chat_url.txt");
export const SYSTEM_PROMPT_FILE = path.join(__dirname, "../prompts/system.txt");
export const ACTUAL_TOOLS = ["get_time"];

export const SELECTORS = {
  TEXTAREA: "textarea",
  RESPONSE_BLOCK: ".ds-markdown",
  NEW_CHAT_BUTTON: 'text="New chat"',
};

export const CONFIG = {
  HEADLESS: true,
  POLLING_INTERVAL: 500,
  STABILITY_COUNT: 3, // How many times the text must repeat to consider it complete
};
