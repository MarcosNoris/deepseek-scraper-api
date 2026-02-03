// src/config/constants.js
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas absolutas para evitar problemas al ejecutar desde otras carpetas
export const STORAGE_PATH = path.join(__dirname, '../../storage');
export const AUTH_FILE = path.join(STORAGE_PATH, 'auth.json');
export const CHAT_URL_FILE = path.join(STORAGE_PATH, 'last_chat_url.txt');

export const SELECTORS = {
    TEXTAREA: 'textarea',
    RESPONSE_BLOCK: '.ds-markdown', // Ajustar si cambia
    NEW_CHAT_BUTTON: 'text="New chat"',
    SEND_BUTTON: 'button[aria-label="Send"]' // O simulación de Enter
};

export const CONFIG = {
    HEADLESS: false, // Cambiar a true en producción si se logra evadir detección
    POLLING_INTERVAL: 500,
    STABILITY_COUNT: 3 // Cuántas veces debe repetirse el texto para considerar fin
};
