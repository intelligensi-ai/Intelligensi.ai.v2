import OpenAI from "openai";
import { defineString } from "firebase-functions/params";

const OPENAI_API_KEY = defineString("OPENAI_API_KEY");

/**
 * Get a single-response chat completion from OpenAI.
 * Uses a concise system prompt suitable for site/content tasks.
 *
 * @param prompt User prompt string
 * @return Assistant text content (empty string if none)
 */
export async function getOpenAIResponse(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || OPENAI_API_KEY.value();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey });

  const system =
    "You are Intelligensi's Drupal+Web assistant. Provide structured, concise, and reliable responses.";

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  const first = res.choices?.[0]?.message?.content ?? "";
  return typeof first === "string" ? first : "";
}
