# Documentación del Proyecto: DeepSeek Playwright Bot

Este documento describe la arquitectura y funcionamiento del proyecto de automatización web para DeepSeek. Está diseñado para proporcionar contexto rápido a Agentes de IA que necesiten modificar, depurar o extender el código.

## 📌 Propósito del Proyecto
Crear una interfaz de línea de comandos (CLI) interactiva que permita conversar con DeepSeek (versión Web) utilizando **Playwright** para la automatización del navegador. El sistema gestiona la persistencia de la sesión y del historial de chat para evitar logins repetitivos.

## 🛠 Tech Stack
- **Runtime:** Node.js
- **Librería Principal:** Playwright (`chromium`)
- **Entrada/Salida:** `readline` (stdin/stdout) para interacción en consola.
- **Sistema de Archivos:** `fs` para persistencia de cookies y estado.

## 📂 Estructura de Archivos

### 1. `login.js` (Setup Inicial)
- **Función:** Script de ejecución única.
- **Lógica:** Abre un navegador en modo `headless: false`. Espera 60 segundos para que el usuario realice el login manual (resolviendo CAPTCHAs si es necesario).
- **Salida:** Genera el archivo `auth.json` con las cookies y `localStorage`.

### 2. `index.js` (Core Logic)
- **Función:** Script principal. Ejecuta el bucle de chat.
- **Flujo:**
  1. Carga el contexto del navegador usando `auth.json`.
  2. Verifica si existe `last_chat_url.txt` para retomar la conversación anterior.
  3. Inicia un bucle `while(true)` para recibir inputs del usuario.
  4. Detecta respuestas mediante comparación de conteo de elementos DOM y estabilidad del texto (polling).

### 3. Archivos de Estado (Ignorados en Git)
- `auth.json`: Contiene el `storageState` de Playwright (Cookies/Session).
- `last_chat_url.txt`: Contiene la URL string del último chat activo (ej: `https://chat.deepseek.com/chat/a/chat/s:xxxxx`).

## 🧠 Lógica Crítica para Agentes de IA

Si vas a modificar el código, ten en cuenta estos patrones de diseño implementados:

### Estrategia de Selectores DOM
El sitio de DeepSeek es una SPA (Single Page Application). Los selectores son volátiles.
- **Input:** Se usa `textarea` genérico.
- **Respuestas:** Se asume la clase `.ds-markdown` (o similar) para los bloques de respuesta.
- **Envío:** Se simula la tecla `Enter` sobre el textarea.

### Detección de Fin de Respuesta (Streaming)
Como DeepSeek envía la respuesta token por token (streaming), no se puede esperar simplemente a que aparezca el elemento.
**Algoritmo implementado:**
1. Contar mensajes existentes (`count()`) antes de enviar.
2. Esperar a que el conteo aumente (`waitForFunction`).
3. Seleccionar el último elemento `.last()`.
4. **Polling de estabilidad:** Leer el `innerText` cada 500ms. Si el texto no cambia durante 3 iteraciones (1.5s), se asume que la respuesta ha finalizado.

### Manejo de Sesión
- No se intenta automatizar el login (user/pass) para evitar bloqueos por bot detection o Cloudflare.
- Se confía estrictamente en la validez de las cookies en `auth.json`.

## ⚠️ Limitaciones y Riesgos
1. **Cambios en el DOM:** Si DeepSeek cambia la clase `.ds-markdown` o convierte el `textarea` en un `div contenteditable`, el scraper fallará.
2. **Expiración de Sesión:** Si `auth.json` expira, el script fallará y requerirá volver a ejecutar `login.js`.
3. **Headless Mode:** Actualmente configurado en `headless: false`. Cambiar a `true` podría disparar detecciones de seguridad de Cloudflare más agresivas.

## 📋 Comandos de Usuario
- **Conversar:** Escribir texto y presionar Enter.
- **Salir:** Escribir `/quit`.