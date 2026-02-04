# DeepSeek Custom API - API Bridge

API that acts as a bridge between DeepSeek's web interface and an OpenAI-compatible API.

## Project Structure

```
deepseek-bot/
├── src/
│   ├── config/           # Constants and configuration (file paths, selectors)
│   │   └── constants.js
│   ├── controllers/      # Request/response logic (OpenAI format)
│   │   ├── chatController.js
│   │   └── authController.js
│   ├── routes/           # Express endpoints definition
│   │   └── api.js
│   ├── services/         # Business logic (Playwright, Scraping, Browser)
│   │   └── deepSeekService.js
│   └── utils/            # Helper utilities
│       └── textCleaner.js
├── storage/              # Stores auth.json and last_chat_url.txt
├── scripts/              # Maintenance scripts
│   └── login.js
├── server.js             # Main entry point
├── package.json
├── .gitignore
└── README.md
```

## Installation

```bash
# Install dependencies
npm install

# Run login script (required first time)
npm run login
```

## Usage

### Start API Server

```bash
npm start
```

The server will be available at `http://localhost:3000` with the following OpenAI-compatible endpoints:

- `GET /v1/models` - Lists available models
- `POST /v1/chat/completions` - Sends a message and receives a response

### Example with curl

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-scraper",
    "messages": [{"role": "user", "content": "Hello, how are you?"}]
  }'
```

## Architecture

### Separation of Concerns

- **Config** (`src/config/`): Constants, file paths, and CSS selectors centralized
- **Services** (`src/services/`): Business logic, browser handling with Playwright
- **Controllers** (`src/controllers/`): HTTP request handling and response formatting
- **Routes** (`src/routes/`): Endpoint definition and routing

### Advantages of this architecture:

1. **Maintainability**: If DeepSeek changes a CSS selector, only modify `constants.js`
2. **Scalability**: Easy to add new services or endpoints
3. **Testability**: Each layer can be tested independently
4. **Clarity**: Each file has a specific responsibility

## Configuration

You can modify settings in `src/config/constants.js`:

- `HEADLESS`: Set to `true` to run browser without GUI
- `POLLING_INTERVAL`: Time between streaming checks (ms)
- `STABILITY_COUNT`: Number of checks to consider response complete

## Available Scripts

- `npm start` - Starts the API server
- `npm run login` - Executes login script to save session

## Session Files

Session files are stored in the `storage/` folder:

- `auth.json`: Contains cookies and authentication state
- `last_chat_url.txt`: URL of the last chat to continue conversation

**Note**: These files are git-ignored for security.

## Security

- Authentication files are in `.gitignore`
- No credentials exposed in code
- Session is reused to avoid multiple logins
