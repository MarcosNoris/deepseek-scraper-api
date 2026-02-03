// login.js
import  { chromium } from 'playwright'


  // Lanzamos navegador en modo visible (headless: false)
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🔹 Navegando a DeepSeek. Por favor, inicia sesión manualmente en la ventana que se abrió...');
  
  await page.goto('https://chat.deepseek.com/');

  // Esperamos 60 segundos (o más) para que te loguees manualmente.
  // Cuando termines de loguearte y veas el chat, el script guardará la sesión.
  // Puedes ajustar este tiempo o cerrar el script manualmente si ya acabaste antes.
  await page.waitForTimeout(60000); 

  // Guardamos el estado (cookies, local storage) en un archivo
  await context.storageState({ path: 'auth.json' });
  console.log('✅ Sesión guardada en auth.json');

  await browser.close();
