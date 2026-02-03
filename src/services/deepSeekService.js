// src/services/deepSeekService.js
import { chromium } from 'playwright';
import fs from 'fs';
import { AUTH_FILE, CHAT_URL_FILE, SELECTORS, CONFIG } from '../config/constants.js';

class DeepSeekService {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isReady = false;
        this.isProcessing = false;
    }

    async init() {
        if (!fs.existsSync(AUTH_FILE)) {
            throw new Error(`❌ No existe ${AUTH_FILE}. Ejecuta 'npm run login' primero.`);
        }

        console.log('🔹 [DeepSeekService] Iniciando navegador...');
        this.browser = await chromium.launch({ 
            headless: CONFIG.HEADLESS, 
            args: ['--start-maximized'] 
        });
        
        const context = await this.browser.newContext({ storageState: AUTH_FILE });
        this.page = await context.newPage();

        // Recuperar sesión anterior
        let targetUrl = 'https://chat.deepseek.com/';
        if (fs.existsSync(CHAT_URL_FILE)) {
            const savedUrl = fs.readFileSync(CHAT_URL_FILE, 'utf-8').trim();
            if (savedUrl.includes('chat.deepseek.com')) targetUrl = savedUrl;
        }

        await this.page.goto(targetUrl);
        await this.page.waitForSelector(SELECTORS.TEXTAREA, { timeout: 60000 });
        
        this.isReady = true;
        console.log('✅ [DeepSeekService] Navegador listo.');
    }

    async sendMessage(text) {
        if (this.isProcessing) {
            throw new Error("BUSY");
        }
        this.isProcessing = true;

        try {
            // 1. Contar respuestas actuales
            const previousCount = await this.page.locator(SELECTORS.RESPONSE_BLOCK).count();

            // 2. Enviar mensaje
            await this.page.fill(SELECTORS.TEXTAREA, text);
            await this.page.waitForTimeout(300);
            await this.page.locator(SELECTORS.TEXTAREA).press('Enter');

            // Guardar URL actual
            const currentUrl = this.page.url();
            fs.writeFileSync(CHAT_URL_FILE, currentUrl);

            // 3. Esperar nueva respuesta (timeout alto por si hay cola)
            await this.page.waitForFunction(
                (selector, count) => document.querySelectorAll(selector).length > count,
                [SELECTORS.RESPONSE_BLOCK, previousCount],
                { timeout: 60000 }
            );

            // 4. Polling de estabilidad (Streaming)
            const lastResponseLocator = this.page.locator(SELECTORS.RESPONSE_BLOCK).last();
            let prevText = '';
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

// Exportamos una instancia única (Singleton)
export const deepSeekService = new DeepSeekService();
