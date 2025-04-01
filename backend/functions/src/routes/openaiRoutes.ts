import express from "express";
import type { RequestHandler } from "express";
import axios from "axios";
import https from "https";
import { config } from "dotenv";

config();

const router = express.Router();

// HTTPS Agent for secure connections
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// OpenAI API key

// Sanitize text
const sanitizeText = (text: string): string => text.replace(/<[^>]*>?/gm, "");

// Update Homepage route
const updateHomepage: RequestHandler = async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

<<<<<<< HEAD
// Utility function to sanitize text
const sanitizeText = (text: string): string => {
  return text.replace(/<[^>]*>?/gm, ""); // Removes HTML tags
};

// Temporarily hardcode the OpenAI API key

// Update Homepage - OpenAI Integration
router.post("/update-homepage", function(req, res) {
  const handleUpdateHomepage = async () => {
    const prompt = req.body.prompt;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    try {
      const openAIRequest: OpenAIRequest = {
        model: "gpt-4o",
=======
  try {
    const openAIResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
>>>>>>> 6f2b9ca (Refactor OpenAI integration in updateHomepage route; streamline request handling, improve error responses, and enhance text sanitization)
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
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    res.status(500).json({
      error: "Failed to process your request",
      details: error.message
    });
  }
};

router.post("/update-homepage", updateHomepage);

export default router;
