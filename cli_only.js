// index.js
import { chromium } from "playwright";
import fs from "fs";
import readline from "readline";

// Configuración para leer entrada de la consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Función auxiliar para preguntar en consola
const askUser = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

// Archivo donde guardaremos la URL del chat actual
const CHAT_URL_FILE = "last_chat_url.txt";

async function runChatBot() {
  // 1. Verificar sesión
  if (!fs.existsSync("auth.json")) {
    console.error(
      "❌ No se encontró auth.json. Ejecuta primero 'node login.js'",
    );
    process.exit(1);
  }

  console.log("🔹 Lanzando navegador...");

  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({ storageState: "auth.json" });
  const page = await context.newPage();

  try {
    // 2. Determinar a qué URL ir
    let targetUrl = "https://chat.deepseek.com/";
    if (fs.existsSync(CHAT_URL_FILE)) {
      const savedUrl = fs.readFileSync(CHAT_URL_FILE, "utf-8").trim();
      // Solo retomamos si parece una URL válida de DeepSeek
      if (savedUrl.includes("chat.deepseek.com")) {
        console.log(`🔹 Retomando conversación anterior: ${savedUrl}`);
        targetUrl = savedUrl;
      }
    }

    await page.goto(targetUrl);

    // Esperar a que cargue el input
    const textareaSelector = "textarea";
    await page.waitForSelector(textareaSelector, { timeout: 30000 });

    let currentUrl = page.url();
    if (currentUrl !== targetUrl && currentUrl.includes("/chat/")) {
      fs.writeFileSync(CHAT_URL_FILE, currentUrl);
    }

    console.log("\n🤖 BOT LISTO.");
    console.log("   - Escribe tu pregunta.");
    console.log('   - "/new" para nuevo chat.');
    console.log('   - "/quit" para salir.');
    console.log("---------------------------------------------------------");

    // 3. Bucle infinito
    while (true) {
      const question = await askUser("brou > ");

      // --- COMANDO: SALIR ---
      if (question.toLowerCase() === "/quit") {
        console.log("👋 Cerrando sesión...");
        break;
      }

      // --- COMANDO: NUEVO CHAT ---
      if (question.toLowerCase() === "/new") {
        console.log("🔄 Creando nuevo chat...");
        try {
          // Buscamos el elemento que contenga el texto "New chat"
          // Playwright es inteligente buscando texto visible
          await page.click('text="New chat"');

          // Esperamos un poco a que la UI reaccione y limpie el área
          await page.waitForTimeout(1000);

          // Actualizamos la referencia de la URL (volverá a la base)
          currentUrl = "https://chat.deepseek.com/";

          // Guardamos la base en el archivo para olvidar el chat anterior
          fs.writeFileSync(CHAT_URL_FILE, currentUrl);

          console.log("✅ Nuevo chat iniciado. Esperando tu pregunta...");
          continue; // Saltamos al inicio del bucle para pedir input
        } catch (err) {
          console.error(
            '⚠️ No se pudo dar click en "New chat". Intenta de nuevo.',
            err.message,
          );
          continue;
        }
      }

      if (!question.trim()) continue;

      // --- A. Contar respuestas ANTES de enviar ---
      const responseSelector = ".ds-markdown";
      const previousResponsesCount = await page
        .locator(responseSelector)
        .count();

      // --- B. Enviar pregunta ---
      await page.fill(textareaSelector, question);
      await page.waitForTimeout(500);
      await page.locator(textareaSelector).press("Enter");

      process.stdout.write("🔹 Esperando respuesta...");

      // Detectar cambio de URL (si era un chat nuevo y ahora tiene ID)
      if (page.url() !== currentUrl) {
        currentUrl = page.url();
        fs.writeFileSync(CHAT_URL_FILE, currentUrl);
      }

      // --- C. Esperar NUEVA respuesta ---
      try {
        await page.waitForFunction(
          (count) => document.querySelectorAll(".ds-markdown").length > count,
          previousResponsesCount,
          { timeout: 40000 }, // Damos un poco más de tiempo por si hay lag
        );
      } catch (e) {
        console.log(
          "\n⚠️ Tiempo de espera agotado. Puede que DeepSeek esté lento.",
        );
        continue;
      }

      // --- D. Streaming (Esperar a que termine de escribir) ---
      const lastResponseLocator = page.locator(responseSelector).last();
      let prevText = "";
      let steadyCount = 0;

      while (true) {
        const currentText = await lastResponseLocator.innerText();

        if (currentText === prevText && currentText.length > 0) {
          steadyCount++;
        } else {
          steadyCount = 0;
          process.stdout.write(".");
        }

        if (steadyCount >= 3) {
          // ~1.5 segundos estable
          break;
        }

        prevText = currentText;
        await page.waitForTimeout(500);
      }

      console.log("\n");
      console.log("💬 DEEPSEEK:");
      console.log(prevText);
      console.log("---------------------------------------------------------");
    }
  } catch (error) {
    console.error("❌ Error inesperado:", error);
  } finally {
    rl.close();
    await browser.close();
  }
}

runChatBot();
