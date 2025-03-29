import type { Request, Response } from "express";
import { Router } from "express";
import axios, { AxiosError } from "axios";
import https from "https";
import { config } from "dotenv";
import asyncHandler from "../utils/asyncHandler";

config();

// eslint-disable-next-line new-cap
const router = Router();

// ✅ HTTPS Agent for secure connections
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// ✅ Sanitize text
const sanitizeText = (text: string): string => text.replace(/<[^>]*>?/gm, "");

// 🔥 OpenAI route wrapped with `asyncHandler`
router.post("/update-homepage", asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { prompt }: { prompt: string } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

  try {
    const openAIResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 1,
        max_tokens: 2048,
        response_format: { type: "text" }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        httpsAgent
      }
    );

    const message = openAIResponse.data.choices?.[0]?.message?.content || "No content returned";
    const sanitizedText = sanitizeText(message);

    res.status(200).json({
      message: `Homepage updated successfully with: ${sanitizedText}`
    });
  } catch (error: unknown) {
    console.error("OpenAI API error:", error instanceof Error ? error.message : "Unknown error");

    let errorMessage = "Failed to process your request.";
    if (error instanceof AxiosError) {
      errorMessage = error.response?.data?.error?.message || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    res.status(500).json({
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    });
  }
}));

export default router;
