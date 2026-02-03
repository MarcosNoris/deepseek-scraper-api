// server.js
import express from "express";
import cors from "cors";
import apiRoutes from "./src/routes/api.js";
import { deepSeekService } from "./src/services/deepSeekService.js";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// Prefijo /v1 para compatibilidad OpenAI
app.use("/v1", apiRoutes);

// Iniciar
app.listen(PORT, async () => {
  console.log(`🚀 Servidor API escuchando en http://localhost:${PORT}`);

  try {
    await deepSeekService.init();
  } catch (error) {
    console.error("🔥 Error crítico al iniciar Playwright:", error.message);
    process.exit(1);
  }
});
