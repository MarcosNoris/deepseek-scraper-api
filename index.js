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

// Archivo donde guardaremos la URL del chat actual para retomarlo si cerramos el script
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
    // 2. Determinar a qué URL ir (Retomar chat anterior o iniciar uno nuevo)
    let targetUrl = "https://chat.deepseek.com/";
    if (fs.existsSync(CHAT_URL_FILE)) {
      const savedUrl = fs.readFileSync(CHAT_URL_FILE, "utf-8").trim();
      if (savedUrl.includes("chat.deepseek.com")) {
        console.log(`🔹 Retomando conversación anterior: ${savedUrl}`);
        targetUrl = savedUrl;
      }
    }

    await page.goto(targetUrl);

    // Esperar a que cargue el input
    const textareaSelector = "textarea";
    await page.waitForSelector(textareaSelector, { timeout: 30000 });

    // Detectar si DeepSeek nos redirigió a un ID nuevo y guardarlo
    let currentUrl = page.url();
    if (currentUrl !== targetUrl && currentUrl.includes("/chat/")) {
      fs.writeFileSync(CHAT_URL_FILE, currentUrl);
    }

    console.log('\n🤖 BOT LISTO. Escribe tu pregunta (o "/quit" para salir).');
    console.log("---------------------------------------------------------");

    // 3. Bucle infinito de preguntas
    while (true) {
      const question = await askUser("brou > ");

      if (question.toLowerCase() === "/quit") {
        console.log("👋 Cerrando sesión...");
        break;
      }

      if (!question.trim()) continue;

      // --- A. Contar cuántas respuestas existen ANTES de enviar ---
      // Esto es clave para saber cuál es la respuesta nueva
      const responseSelector = ".ds-markdown"; // Ajustar si cambia la clase
      const previousResponsesCount = await page
        .locator(responseSelector)
        .count();

      // --- B. Enviar pregunta ---
      await page.fill(textareaSelector, question);
      await page.waitForTimeout(500); // Pequeña pausa humana
      await page.locator(textareaSelector).press("Enter");

      process.stdout.write("🔹 Esperando respuesta...");

      // Guardar URL si es el primer mensaje y cambia la dirección
      if (page.url() !== currentUrl) {
        currentUrl = page.url();
        fs.writeFileSync(CHAT_URL_FILE, currentUrl);
      }

      // --- C. Esperar a que aparezca la NUEVA respuesta ---
      // Esperamos a que el número de elementos .ds-markdown sea mayor que antes
      try {
        await page.waitForFunction(
          (count) => document.querySelectorAll(".ds-markdown").length > count,
          previousResponsesCount,
          { timeout: 30000 },
        );
      } catch (e) {
        console.log(
          "\n⚠️ Tiempo de espera agotado o no se detectó respuesta nueva.",
        );
        continue;
      }

      // --- D. Esperar a que termine de escribirse (Streaming) ---
      // Obtenemos el localizador del ÚLTIMO elemento
      const lastResponseLocator = page.locator(responseSelector).last();

      let prevText = "";
      let steadyCount = 0;

      // Bucle de polling para ver si el texto dejó de cambiar
      while (true) {
        const currentText = await lastResponseLocator.innerText();

        if (currentText === prevText && currentText.length > 0) {
          steadyCount++;
        } else {
          steadyCount = 0;
          // Efecto visual de carga en consola (opcional)
          process.stdout.write(".");
        }

        // Si el texto no ha cambiado en 3 intentos (1.5 segundos), asumimos que terminó
        if (steadyCount >= 3) {
          break;
        }

        prevText = currentText;
        await page.waitForTimeout(500); // Revisar cada medio segundo
      }

      console.log("\n"); // Salto de línea después de los puntos de carga
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

// Ejecutar
runChatBot();
