# Documentación del Proyecto: DeepSeek OpenAI-Compatible API Bridge

Este documento describe la arquitectura y funcionamiento del sistema que convierte la interfaz web de DeepSeek en una **API REST compatible con OpenAI**. Está diseñado para proporcionar contexto rápido a Agentes de IA que necesiten modificar, depurar o extender el código.

## 📌 Propósito del Proyecto
Servir como un "puente" (bridge) entre clientes que consumen la API de OpenAI (como Vercel AI SDK, LangChain, o Apps de Chat) y la versión web gratuita de DeepSeek. El sistema levanta un servidor HTTP que recibe peticiones JSON estándar, automatiza un navegador oculto para procesarlas en `chat.deepseek.com`, y devuelve la respuesta en formato OpenAI.

## 🛠 Tech Stack Actualizado
- **Runtime:** Node.js
- **Servidor HTTP:** Express (`express`, `cors`)
- **Automatización:** Playwright (`chromium`)
- **Utilidades:** `uuid` (generación IDs), `fs` (persistencia).

## 📂 Estructura de Archivos

### 1. `login.js` (Setup Inicial - Manual)
- **Función:** Script de ejecución única (`node login.js`).
- **Propósito:** Abrir navegador para que el humano inicie sesión manualmente y resuelva CAPTCHAs.
- **Salida:** Genera `auth.json` (cookies/storage). **Requisito obligatorio** antes de iniciar el servidor.

### 2. `server.js` (Core - API Server)
- **Función:** Punto de entrada principal (`node server.js`).
- **Arquitectura:**
  - Clase `DeepSeekBrowser`: Encapsula la instancia de Playwright, gestión de pestañas y lógica de scraping.
  - Servidor Express: Expone endpoints `/v1/...`.
- **Estado:**
  - Gestiona un archivo `last_chat_url.txt` para mantener la continuidad de la conversación entre reinicios del servidor.
  - Implementa un bloqueo simple (Mutex `isProcessing`) para evitar colisiones (una pregunta a la vez).

### 3. Archivos de Persistencia (Ignorados en Git)
- `auth.json`: Credenciales de sesión.
- `last_chat_url.txt`: URL del chat actual (ej: `.../chat/s:xxxxx`) para mantener "Memoria".

## 🔌 API Specification (OpenAI Compatible)

El servidor escucha en `http://localhost:3000` y emula los endpoints de OpenAI.

### `POST /v1/chat/completions`
- **Input:** JSON estándar de OpenAI (`messages`, `model`).
- **Comportamiento Crítico:**
  - Ignora el historial completo del array `messages`.
  - Extrae **solo el último mensaje** con `role: "user"`.
  - *Razón:* La web de DeepSeek gestiona su propia memoria/contexto. Si reenviamos todo el historial, DeepSeek se confundirá.
- **Output:** JSON estático (Non-streaming) con la estructura `choices[0].message.content`.

### `GET /v1/models`
- Endpoint dummy para compatibilidad con clientes que listan modelos antes de conectar.

## 🧠 Lógica Crítica para Agentes de IA

### 1. Estrategia de Scraping & Selectores
El DOM es dinámico (SPA). La lógica de extracción se basa en comportamiento, no en clases fijas:
- **Input:** Selector `textarea`.
- **Detección de Respuesta:**
  1. Cuenta elementos `.ds-markdown` existentes antes de enviar.
  2. Envía mensaje (simula `Enter`).
  3. Espera a que `count(.ds-markdown)` aumente.
  4. Selecciona el `.last()` elemento.

### 2. Algoritmo de Finalización (Streaming Handling)
Como no tenemos acceso a eventos de socket de DeepSeek, usamos **Polling de Estabilidad**:
- Se lee el `innerText` del último mensaje cada 500ms.
- Si el texto **no cambia** durante 3 ciclos consecutivos (aprox. 1.5s) y tiene longitud > 0, se considera que la respuesta está completa.

### 3. Manejo de Concurrencia (Mutex)
- **Limitación:** Un solo navegador = Un cursor del mouse.
- **Implementación:** Variable `isProcessing`.
- Si llega una petición mientras el navegador está escribiendo/leyendo, el servidor responde **HTTP 429 (Too Many Requests)** con mensaje "BUSY".

## ⚠️ Limitaciones y Riesgos Conocidos

1.  **No Streaming:** La API espera a que la respuesta termine *completamente* antes de enviar el JSON al cliente. El cliente percibirá un tiempo de espera largo (Time to First Byte alto).
2.  **Contexto Implícito:** El contexto depende de la sesión del navegador. Si dos clientes distintos usan la API, compartirán el mismo historial de chat en DeepSeek (mezcla de conversaciones).
3.  **Fragilidad DOM:** Si DeepSeek cambia la estructura de divs anidados o la forma de renderizar Markdown, el scraper fallará (timeout esperando respuesta).
4.  **Single-Thread:** No soporta múltiples chats paralelos.

## 📋 Comandos Útiles

- **Iniciar Servidor:** `node server.js`
- **Generar Auth:** `node login.js`
- **Resetear Chat:** El código tiene lógica para un botón "New Chat", pero actualmente la API reutiliza la última URL guardada. Para forzar nuevo chat, borrar `last_chat_url.txt` o implementar un endpoint específico.
