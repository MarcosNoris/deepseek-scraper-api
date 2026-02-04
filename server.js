import express from "express";
import cors from "cors";
import apiRoutes from "./src/routes/api.js";
import { deepSeekService } from "./src/services/deepSeekService.js";
import fs from "fs";
import { AUTH_FILE } from "./src/config/constants.js";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

app.use("/v1", apiRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: deepSeekService.isReady ? "ready" : "awaiting_auth",
    browserOpen: !!deepSeekService.browser,
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 API Server listening on http://localhost:${PORT}`);

  if (fs.existsSync(AUTH_FILE)) {
    try {
      console.log("🔹 Found existing session, initializing...");
      await deepSeekService.init();
    } catch (error) {
      console.warn("⚠️ Could not restore session:", error.message);
    }
  } else {
    console.log(
      "🔹 No session found. POST /v1/auth with email and password to authenticate.",
    );
  }
});
