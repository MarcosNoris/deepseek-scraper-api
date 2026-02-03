// src/controllers/chatController.js
import { v4 as uuidv4 } from 'uuid';
import { deepSeekService } from '../services/deepSeekService.js';

export const listModels = (req, res) => {
    res.json({
        object: "list",
        data: [{
            id: "deepseek-scraper",
            object: "model",
            created: 1677610602,
            owned_by: "local"
        }]
    });
};

export const createChatCompletion = async (req, res) => {
    if (!deepSeekService.isReady) {
        return res.status(503).json({ error: { message: "Servicio iniciando, intenta en breve." } });
    }

    const { messages, model } = req.body;

    // Validación básica
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: { message: "Formato inválido." } });
    }

    // Extraer último mensaje del usuario
    const lastUserMessage = messages.reverse().find(m => m.role === 'user');
    
    if (!lastUserMessage) {
        return res.status(400).json({ error: { message: "Se requiere un mensaje de usuario." } });
    }

    try {
        console.log(`📩 [API] Procesando mensaje...`);
        const responseText = await deepSeekService.sendMessage(lastUserMessage.content);

        // Formato OpenAI
        res.json({
            id: `chatcmpl-${uuidv4()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: model || "deepseek-scraper",
            choices: [{
                index: 0,
                message: {
                    role: "assistant",
                    content: responseText
                },
                finish_reason: "stop"
            }],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
        });

    } catch (error) {
        if (error.message === "BUSY") {
            return res.status(429).json({ error: { message: "El sistema está ocupado procesando otra solicitud." } });
        }
        res.status(500).json({ error: { message: error.message } });
    }
};
