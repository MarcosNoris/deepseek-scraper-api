import { v4 as uuidv4 } from "uuid";
import { deepSeekService } from "../services/deepSeekService.js";

export const listModels = (req, res) => {
  res.json({
    object: "list",
    data: [
      {
        id: "deepseek-scraper",
        object: "model",
        created: 1677610602,
        owned_by: "local",
      },
    ],
  });
};

export const createChatCompletion = async (req, res) => {
  if (!deepSeekService.isReady) {
    return res
      .status(503)
      .json({ error: { message: "Service not ready. Please authenticate via POST /v1/auth first." } });
  }


  const { message: messages, model, tools } = req.body;

  if (!messages) {
    return res.status(400).json({ error: { message: "Invalid format." } });
  }

  // Extract last user message
  

  if (!messages.content) {
    return res
      .status(400)
      .json({ error: { message: "A user message is required." } });
  }

  try {
    console.log(`📩 [API] Processing message...`);
    const processedResponse = await deepSeekService.ProcessUserMessage(req.body);

    // OpenAI format
    res.json({
      id: `chatcmpl-${uuidv4()}`,
      created: Math.floor(Date.now() / 1000),
      model: model || "deepseek-scraper",
      response: processedResponse,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });
  } catch (error) {
    if (error.message === "BUSY") {
      return res.status(429).json({
        error: { message: "The system is busy processing another request." },
      });
    }
    res.status(500).json({ error: { message: error.message } });
  }
};
