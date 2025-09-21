import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { sendResponse, sanitizeText } from "../utils/response";
import { getOpenAIResponse, OpenAIMessage } from "../openai/chat";
import { handleMenuOperation } from "../drupal/menu";
import { generateAndUploadImage } from "../drupal/media";
import { createDrupalContent } from "../drupal/content";

const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Initialize Firebase Admin once
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch {
    // ignore
  }
}

export const updateHomepage = onRequest({ secrets: [openaiApiKey], cors: true }, async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const { prompt } = req.body || {};
    if (!prompt) return sendResponse(res, 400, { error: "Prompt is required" });

    const message: OpenAIMessage = await getOpenAIResponse(prompt);
    if (!message?.tool_calls || message.tool_calls.length === 0) {
      return sendResponse(res, 200, {
        message: message?.content || "No response from assistant",
      });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const toolCall of message.tool_calls) {
      if (!toolCall.function?.arguments) throw new Error("Function arguments undefined");
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === "orchestrate_menus") {
        try {
          const opsResults: Array<Record<string, unknown>> = [];
          for (const operation of args.operations) {
            const r = await handleMenuOperation(args.menu_name || "main", operation);
            opsResults.push({ action: operation.action, result: r });
          }
          return sendResponse(res, 200, { results: opsResults });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return sendResponse(res, 500, { success: false, error: msg });
        }
      }

      if (toolCall.function.name === "update_homepage") {
        const updateText = args.text || "";
        const sanitized = sanitizeText(updateText);
        results.push({
          function: "update_homepage",
          success: true,
          message: `Homepage updated with: ${sanitized}`,
          data: args,
        });
      } else if (toolCall.function.name === "create_content") {
        let mediaResponse: unknown = null;
        try {
          let imagePrompt = args.image_prompt;
          if (!imagePrompt && args.title) {
            const baseMap: Record<string, string> = {
              recipe: "Appetizing food photography of ",
              article: "Editorial style image for article: ",
              page: "Header image for web page: ",
            };
            const detailsMap: Record<string, string> = {
              recipe:
                ", professional food styling, high resolution, restaurant quality",
              article: ", professional photography, high resolution",
              page: ", modern web design, high resolution",
            };
            imagePrompt = `${baseMap[args.content_type] || ""}${args.title}` +
              `${detailsMap[args.content_type] || ""}`;
          }

          if (imagePrompt) {
            console.log(`Generating image with prompt: ${imagePrompt}`);
            try {
              mediaResponse = await generateAndUploadImage({
                prompt: imagePrompt,
                title: args.title,
                siteUrl: process.env.DRUPAL_SITE_URL,
              });
              console.log('Media upload successful:', JSON.stringify(mediaResponse, null, 2));
            } catch (error) {
              console.error('Error generating/uploading image:', error);
              // Continue without media if image generation fails
              mediaResponse = null;
            }
          }

          console.log('Creating Drupal content with args:', JSON.stringify(args, null, 2));
          console.log('Media response:', JSON.stringify(mediaResponse, null, 2));
          const created = await createDrupalContent(args, mediaResponse);
          console.log('Drupal content created:', JSON.stringify(created, null, 2));
          results.push({
            function: "create_content",
            success: true,
            drupalResponse: created,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return sendResponse(res, 500, {
            success: false,
            message: `Failed to create content: ${msg}`,
          });
        }
      }
    }

    return sendResponse(res, 200, {
      success: true,
      message: "Operation completed successfully",
      data: results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return sendResponse(res, 500, { success: false, message: msg });
  }
});
