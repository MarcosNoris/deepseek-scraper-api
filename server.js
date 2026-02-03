// server.js
import express from "express";
import { chromium } from "playwright";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// --- CONFIGURACIÓN ---
const AUTH_FILE = "auth.json";
const CHAT_URL_FILE = "last_chat_url.txt";

// --- CLASE PARA GESTIONAR EL NAVEGADOR ---
class DeepSeekBrowser {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isReady = false;
    this.isProcessing = false; // "Mutex" simple para evitar colisiones
  }

  async init() {
    if (!fs.existsSync(AUTH_FILE)) {
      console.error(
        "❌ Error: No existe auth.json. Ejecuta 'node login.js' primero.",
      );
      process.exit(1);
    }

    console.log("🔹 Iniciando navegador Playwright...");
    this.browser = await chromium.launch({
      headless: false,
      args: ["--start-maximized"],
    });

    const context = await this.browser.newContext({ storageState: AUTH_FILE });
    this.page = await context.newPage();

    // Recuperar URL anterior
    let targetUrl = "https://chat.deepseek.com/";
    if (fs.existsSync(CHAT_URL_FILE)) {
      const savedUrl = fs.readFileSync(CHAT_URL_FILE, "utf-8").trim();
      if (savedUrl.includes("chat.deepseek.com")) targetUrl = savedUrl;
    }

    await this.page.goto(targetUrl);

    // Esperar a que la página esté lista
    await this.page.waitForSelector("textarea", { timeout: 60000 });
    this.isReady = true;
    console.log("✅ Navegador listo y esperando peticiones API.");
  }

  async createNewChat() {
    if (!this.page) return;
    try {
      console.log("🔄 Creando nuevo chat...");
      await this.page.click('text="New chat"');
      await this.page.waitForTimeout(1000);
      fs.writeFileSync(CHAT_URL_FILE, "https://chat.deepseek.com/");
    } catch (e) {
      console.error("⚠️ Error al crear nuevo chat:", e.message);
    }
  }

  async sendMessage(text) {
    if (this.isProcessing) {
      throw new Error("BUSY: El navegador está procesando otra pregunta.");
    }
    this.isProcessing = true;

    try {
      const textareaSelector = "textarea";
      const responseSelector = ".ds-markdown";

      // 1. Contar respuestas previas
      const previousCount = await this.page.locator(responseSelector).count();

      // 2. Escribir y enviar
      await this.page.fill(textareaSelector, text);
      await this.page.waitForTimeout(300);
      await this.page.locator(textareaSelector).press("Enter");

      // Guardar URL si cambia
      const currentUrl = this.page.url();
      fs.writeFileSync(CHAT_URL_FILE, currentUrl);

      // 3. Esperar nueva respuesta
      await this.page.waitForFunction(
        (count) => document.querySelectorAll(".ds-markdown").length > count,
        previousCount,
        { timeout: 60000 },
      );

      // 4. Esperar a que termine el streaming (Polling de texto)
      const lastResponseLocator = this.page.locator(responseSelector).last();
      let prevText = "";
      let steadyCount = 0;

      while (true) {
        const currentText = await lastResponseLocator.innerText();
        if (currentText === prevText && currentText.length > 0) steadyCount++;
        else steadyCount = 0;

        if (steadyCount >= 3) break; // Estable por ~1.5s

        prevText = currentText;
        await this.page.waitForTimeout(500);
      }

      return prevText;
    } catch (error) {
      console.error("❌ Error en Playwright:", error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }
}

// Instancia única del navegador
const dsBrowser = new DeepSeekBrowser();

// --- ENDPOINTS API (OPENAI COMPATIBLE) ---

// 1. List Models (Requerido por algunos clientes)
app.get("/v1/models", (req, res) => {
  res.json({
    object: "list",
    data: [
      {
        id: "deepseek-scraper",
        object: "model",
        created: 1677610602,
        owned_by: "local",
      },
    ],
  });
});

// 2. Chat Completions
app.post("/v1/chat/completions", async (req, res) => {
  if (!dsBrowser.isReady) {
    return res
      .status(503)
      .json({
        error: {
          message: "El navegador se está iniciando, intenta en unos segundos.",
        },
      });
  }

  const { messages, model, stream } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res
      .status(400)
      .json({ error: { message: "Formato de mensajes inválido." } });
  }

  // Nota: Como la web de DeepSeek ya tiene memoria,
  // SOLO necesitamos enviar el ÚLTIMO mensaje del usuario.
  // Si enviamos todo el historial, DeepSeek se confundirá o repetirá cosas.
  const lastUserMessage = messages.reverse().find((m) => m.role === "user");

  if (!lastUserMessage) {
    return res
      .status(400)
      .json({ error: { message: "No se encontró un mensaje del usuario." } });
  }

  try {
    // LOGICA OPCIONAL: Detectar si el cliente quiere limpiar contexto (esto es un hack)
    // Si el array de mensajes solo tiene 1 mensaje, podríamos asumir que es un chat nuevo.
    // if (messages.length === 1) await dsBrowser.createNewChat();

    console.log(
      `📩 Recibido: "${lastUserMessage.content.substring(0, 50)}..."`,
    );

    const responseText = await dsBrowser.sendMessage(lastUserMessage.content);

    // Formato de respuesta OpenAI
    const responsePayload = {
      id: `chatcmpl-${uuidv4()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model || "deepseek-scraper",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: responseText,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0, // No calculamos tokens reales
        completion_tokens: 0,
        total_tokens: 0,
      },
    };

    res.json(responsePayload);
  } catch (error) {
    if (error.message.includes("BUSY")) {
      return res
        .status(429)
        .json({
          error: { message: "El sistema está procesando otra solicitud." },
        });
    }
    res.status(500).json({ error: { message: error.message } });
  }
});

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, async () => {
  console.log(`🚀 Servidor API escuchando en http://localhost:${PORT}`);
  await dsBrowser.init();
});
