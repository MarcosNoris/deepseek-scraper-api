import express from "express";
import {
  createChatCompletion,
  listModels,
} from "../controllers/chatController.js";
import { authenticate } from "../controllers/authController.js";

const router = express.Router();

router.get("/models", listModels);
router.post("/chat/completions", createChatCompletion);
router.post("/auth", authenticate);

export default router;
