# DeepSeek Bot - API Bridge

Bot que actúa como bridge entre la interfaz web de DeepSeek y una API compatible con OpenAI.

## 📂 Estructura del Proyecto

```
deepseek-bot/
├── src/
│   ├── config/           # Constantes y configuración (rutas de archivos, selectores)
│   │   └── constants.js
│   ├── controllers/      # Lógica de petición/respuesta (Formato OpenAI)
│   │   └── chatController.js
│   ├── routes/           # Definición de endpoints de Express
│   │   └── api.js
│   ├── services/         # Lógica pesada (Playwright, Scraping, Browser)
│   │   └── deepSeekService.js
│   └── utils/            # Helpers pequeños (si fueran necesarios)
├── storage/              # Aquí se guardan auth.json y last_chat_url.txt
├── scripts/              # Scripts de mantenimiento (login)
│   └── login.js
├── server.js             # Punto de entrada (Entry point)
├── cli_only.js           # Versión CLI del bot (sin servidor)
├── package.json
├── .gitignore
└── README.md
```

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar el script de login (necesario la primera vez)
npm run login
```

## 📝 Uso

### Iniciar el servidor API

```bash
npm start
```

El servidor estará disponible en `http://localhost:3000` con los siguientes endpoints compatibles con OpenAI:

- `GET /v1/models` - Lista los modelos disponibles
- `POST /v1/chat/completions` - Envía un mensaje y recibe una respuesta

### Ejemplo de uso con curl

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-scraper",
    "messages": [{"role": "user", "content": "Hola, ¿cómo estás?"}]
  }'
```

## 🏗️ Arquitectura

### Separación de Responsabilidades

- **Config** (`src/config/`): Constantes, rutas de archivos y selectores CSS centralizados
- **Services** (`src/services/`): Lógica de negocio, manejo del navegador con Playwright
- **Controllers** (`src/controllers/`): Manejo de peticiones HTTP y formato de respuestas
- **Routes** (`src/routes/`): Definición de endpoints y enrutamiento

### Ventajas de esta arquitectura:

1. **Mantenibilidad**: Si DeepSeek cambia un selector CSS, solo se modifica en `constants.js`
2. **Escalabilidad**: Fácil agregar nuevos servicios o endpoints
3. **Testabilidad**: Cada capa puede ser testeada independientemente
4. **Claridad**: Cada archivo tiene una responsabilidad específica

## 🔧 Configuración

Puedes modificar la configuración en `src/config/constants.js`:

- `HEADLESS`: Cambiar a `true` para ejecutar el navegador sin interfaz gráfica
- `POLLING_INTERVAL`: Tiempo de espera entre verificaciones de streaming (ms)
- `STABILITY_COUNT`: Número de verificaciones para considerar la respuesta completa

## 📦 Scripts disponibles

- `npm start` - Inicia el servidor API
- `npm run login` - Ejecuta el script de login para guardar la sesión

## 🔐 Archivos de Sesión

Los archivos de sesión se guardan en la carpeta `storage/`:

- `auth.json`: Contiene las cookies y el estado de autenticación
- `last_chat_url.txt`: URL del último chat para continuar la conversación

**Nota**: Estos archivos están excluidos de git por seguridad.

## 🛡️ Seguridad

- Los archivos de autenticación están en `.gitignore`
- No se exponen credenciales en el código
- La sesión se reutiliza para evitar múltiples logins
