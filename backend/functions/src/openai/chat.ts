import axios from "../utils/axios";

export interface OpenAIMessageFunctionCall {
  name: string;
  arguments: string;
}

export interface OpenAIToolCall {
  type?: string;
  function: OpenAIMessageFunctionCall;
}

export interface OpenAIMessage {
  content?: string;
  tool_calls?: OpenAIToolCall[];
}

/**
 * Create a chat completion with tool calls and return the assistant message.
 * @param {string} prompt User prompt text
 * @return {Promise<OpenAIMessage>} Assistant message object from OpenAI
 */
export async function getOpenAIResponse(prompt: string): Promise<OpenAIMessage> {
  const systemMessage = {
    role: "system",
    content:
      "You are an assistant that ONLY responds by calling one of the " +
      "provided functions. Never reply in plain text.",
  } as const;
  const userMessage = { role: "user", content: prompt } as const;

  const body = {
    model: "gpt-4o-mini",
    messages: [systemMessage, userMessage],
    tools: [
      {
        type: "function",
        function: {
          name: "update_homepage",
          parameters: {
            type: "object",
            required: ["updateText"],
            properties: { updateText: { type: "string" } },
          },
          description: "Updates the homepage with the provided text",
        },
      },
      {
        type: "function",
        function: {
          name: "create_content",
          description: "Creates content on the Drupal 11 site.",
          parameters: {
            type: "object",
            required: ["content_type", "title", "body"],
            properties: {
              content_type: {
                type: "string",
                enum: ["recipe", "article", "page"],
              },
              title: { type: "string" },
              body: { type: "string" },
            },
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "create_content" } },
    temperature: 0.7,
    max_tokens: 1024,
  };

  const openaiKey = process.env.OPENAI_API_KEY;
  const resp = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    body,
    { headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" } }
  );
  return (resp.data.choices[0]?.message ?? {}) as OpenAIMessage;
}
