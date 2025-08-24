import axios from "axios";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";

// Define a type for our request body
interface UpdateHomepageRequest extends Request {
  body: {
    prompt?: string;
  };
}

// Define Firebase secret
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Define types for better type safety
interface Recipe {
  title: string;
  body: string;
  ingredients: string[];
  instructions: string[];
  cooking_time: number;
  servings: number;
  difficulty?: "easy" | "medium" | "hard";
}

interface DrupalResponse {
  data?: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  };
  error?: {
    message: string;
    code: number;
  };
}

interface ToolCallResult<T = unknown> {
  function: string;
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: Record<string, unknown>;
  recipe?: Recipe;
  drupalResponse?: DrupalResponse;
}

// Helper function to handle responses
const sendResponse = <T>(res: Response, status: number, data: T): void => {
  res.status(status).json(data);
};

/**
 * Sanitize text by removing HTML tags.
 * @param {string} text - The text to sanitize.
 * @return {string} - Sanitized text.
 */
function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>?/gm, "");
}

// Standalone Firebase Function with built-in CORS
export const updateHomepage = onRequest(
  {
    secrets: [openaiApiKey],
    cors: true, // Firebase handles CORS automatically
  },
  // @ts-expect-error - Firebase v2 function handler type mismatch
  async (req: UpdateHomepageRequest, res: Response) => {
    // Helper function to send response and mark it as sent
    let responseSent = false;
    const sendSingleResponse = (status: number, data: unknown): void => {
      if (responseSent) return;
      responseSent = true;
      sendResponse(res, status, data);
    };

    try {
      // Handle preflight requests for CORS
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      console.log("Received request:", req.method, req.path, req.body);
      const { prompt } = req.body || {};

      if (!prompt) {
        sendSingleResponse(400, { error: "Prompt is required" });
        return;
      }

      const openAIResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          tools: [
            {
              type: "function",
              function: {
                name: "update_homepage",
                strict: false,
                parameters: {
                  type: "object",
                  required: ["updateText"],
                  properties: {
                    updateText: {
                      type: "string",
                      description: "The text to update the homepage with.",
                    },
                  },
                },
                description: "Updates the homepage with the provided text.",
              },
            },
            {
              type: "function",
              function: {
                name: "create_recipe",
                description: "Creates a new recipe in Drupal 11.",
                parameters: {
                  type: "object",
                  required: ["title", "body", "ingredients", "instructions", "cooking_time", "servings"],
                  properties: {
                    title: { type: "string", description: "The title of the recipe." },
                    body: { type: "string", description: "A detailed description of the recipe." },
                    ingredients: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of ingredients needed for the recipe.",
                    },
                    instructions: {
                      type: "array",
                      items: { type: "string" },
                      description: "Step-by-step instructions for preparing the recipe.",
                    },
                    cooking_time: {
                      type: "number",
                      description: "Total cooking time in minutes.",
                    },
                    servings: {
                      type: "number",
                      description: "Number of servings the recipe makes.",
                    },
                    difficulty: {
                      type: "string",
                      enum: ["easy", "medium", "hard"],
                      description: "Difficulty level of the recipe.",
                    },
                  },
                },
              },
            },
          ],
          temperature: 1,
          max_tokens: 2048,
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const message = openAIResponse.data.choices[0]?.message;
      
      // If there are no tool calls, return the assistant's message
      if (!message.tool_calls || message.tool_calls.length === 0) {
        sendSingleResponse(200, { 
          message: message.content || "No response from assistant"
        });
        return;
      }
      
      const toolCalls = message.tool_calls;

      const results: ToolCallResult[] = [];

      for (const toolCall of toolCalls) {
        if (responseSent) break;

        if (!toolCall.function?.arguments) {
          throw new Error("Function arguments are undefined");
        }

        if (toolCall.function.name === "update_homepage") {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const updateText = args.text || "";
            const sanitizedText = sanitizeText(updateText);

            console.log("update_homepage called with args:", args);

            results.push({
              function: "update_homepage",
              success: true,
              message: `Homepage updated with: ${sanitizedText}`,
              data: args,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error("Error in update_homepage:", errorMessage);
            results.push({
              function: "update_homepage",
              success: false,
              error: errorMessage,
              details: error instanceof Error ? { message: error.message, stack: error.stack } : {},
            });
          }
        } else if (toolCall.function.name === "create_recipe") {
          try {
            const recipeData = JSON.parse(toolCall.function.arguments);
            console.log("create_recipe called with data:", recipeData);

            // Process the recipe data for Drupal
            const summary = recipeData.summary ||
              (recipeData.body ? recipeData.body.substring(0, 200) + "..." : "No summary provided");

            // Convert ingredients array to plain text
            const ingredientsText = Array.isArray(recipeData.ingredients) ?
              recipeData.ingredients.join("\n") :
              recipeData.ingredients || "";

            // Convert instructions array to HTML
            const instructionsHtml = Array.isArray(recipeData.instructions) ?
              recipeData.instructions.map((step: string) => `<p>${step}</p>`).join("") :
              recipeData.instructions || "";

            // Estimate preparation time if not provided (1 minute per instruction step)
            const prepTime = recipeData.prep_time ||
              (Array.isArray(recipeData.instructions) ? recipeData.instructions.length * 1 : 10);

            // Create the recipe payload for Drupal
            const recipe = {
              title: recipeData.title,
              body: recipeData.body || "",
              field_summary: summary,
              field_ingredients: ingredientsText,
              field_recipe_instruction: instructionsHtml,
              field_cooking_time: recipeData.cooking_time || 0,
              field_preparation_time: prepTime,
              field_number_of_servings: recipeData.servings || 1,
              field_difficulty: recipeData.difficulty || "medium",
              field_recipe_category: "main", // Default category
            };

            console.log("Drupal payload:", JSON.stringify(recipe, null, 2));

            // Create the node object with type and title at root level
            const node = {
              type: "node--recipe", // Drupal content type with bundle prefix
              id: `create-${Date.now()}`,
              attributes: {
                title: recipe.title,
                status: 1,
                body: recipe.body,
                field_summary: recipe.field_summary,
                field_ingredients: recipe.field_ingredients,
                field_recipe_instruction: recipe.field_recipe_instruction,
                field_cooking_time: recipe.field_cooking_time,
                field_preparation_time: recipe.field_preparation_time,
                field_number_of_servings: recipe.field_number_of_servings,
                field_difficulty: recipe.field_difficulty,
                field_recipe_category: recipe.field_recipe_category,
              },
            };

            // Clean up any undefined attributes
            Object.keys(node.attributes).forEach((key) => {
              if ((node.attributes as Record<string, unknown>)[key] === undefined) {
                delete (node.attributes as Record<string, unknown>)[key];
              }
            });

            const nodes = [node];

            console.log("Sending to Drupal 11:", JSON.stringify(nodes, null, 2));

            const drupalResponse = await axios.post(
              "http://localhost:5001/intelligensi-ai-v2/us-central1/drupal11/node-update",
              nodes,
              {
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );

            console.log("Drupal response:", JSON.stringify(drupalResponse.data, null, 2));

            results.push({
              function: "create_recipe",
              success: true,
              message: `Recipe "${recipeData.title}" created successfully`,
              recipe: recipeData,
              drupalResponse: drupalResponse.data,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error("Error in create_recipe:", errorMessage);
            results.push({
              function: "create_recipe",
              success: false,
              error: errorMessage,
              details: error instanceof Error ? { message: error.message, stack: error.stack } : {},
            });
          }
        }
      }

      // Return the results of the operations
      sendSingleResponse(200, {
        message: message.content || "Operation completed",
        results: results,
      });
    } catch (error) {
      console.error("Error in updateHomepage:", error);
      sendSingleResponse(500, {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
