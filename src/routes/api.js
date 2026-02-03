// src/routes/api.js
import express from 'express';
import { createChatCompletion, listModels } from '../controllers/chatController.js';

const router = express.Router();

router.get('/models', listModels);
router.post('/chat/completions', createChatCompletion);

export default router;
