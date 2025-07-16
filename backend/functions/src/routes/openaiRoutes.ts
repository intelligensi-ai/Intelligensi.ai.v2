import axios, { AxiosError } from "axios";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";

// Define Firebase secret
const openaiApiKey = defineSecret("OPENAI_API_KEY");

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
    secrets: ["OPENAI_API_KEY"], // Using secret name as string
    cors: true, // Firebase handles CORS automatically
  },
  async (req, res) => {
    // Handle preflight requests for CORS
    if (req.method === "OPTIONS") {
      res.status(204).send();
      return;
    }

    try {
      // Extract required parameters from request body
      const { prompt, siteUrl, cmsVersion = 'drupal7', username, password } = req.body;

      // Validate required fields
      if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }

      if (!siteUrl) {
        res.status(400).json({ error: "Site URL is required" });
        return;
      }
      
      // Ensure the site URL is properly formatted
      const baseUrl = siteUrl.trim().replace(/\/+$/, '');
      
      // Get the API key from the secret
      const apiKey = openaiApiKey.value();
      
      // Log the incoming request details
      console.log('=== UPDATE HOMEPAGE REQUEST ===');
      console.log('CMS Version:', cmsVersion);
      console.log('Site URL:', baseUrl);
      console.log('Request Body:', JSON.stringify({
        prompt: prompt ? `${prompt.substring(0, 50)}...` : 'Empty',
        hasUsername: !!username,
        hasPassword: !!password
      }, null, 2));
      
      // Call OpenAI to generate the homepage content
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
          ],
          temperature: 1,
          max_tokens: 2048,
          response_format: { type: "text" },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
        }
      );

      const toolCall = openAIResponse.data.choices?.[0]?.message?.tool_calls?.[0];

      if (toolCall?.function?.name === "update_homepage") {
        try {
          if (!toolCall.function.arguments) {
            throw new Error("Function arguments are undefined");
          }
          const { updateText } = JSON.parse(toolCall.function.arguments);
          const sanitizedText = sanitizeText(updateText);

          if (cmsVersion === 'drupal11') {
            // For Drupal 11, use the intellibridge endpoint
            const drupalEndpoint = `${baseUrl}/intelligensi-bridge/update-homepage`;
            console.log(`Sending update to Drupal 11 endpoint: ${drupalEndpoint}`);
            
            // Use the specific homepage node ID (19) for Drupal 11
            const HOMEPAGE_NODE_ID = 19;
            
            console.log(`\n=== UPDATING DRUPAL 11 NODE ${HOMEPAGE_NODE_ID} ===`);
            console.log('Node Update URL:', `${baseUrl}/jsonapi/node/page/${HOMEPAGE_NODE_ID}`);
            
            // First, update the existing homepage node with the new content
            try {
              const nodeUpdateResponse = await axios.patch(
                `${baseUrl}/jsonapi/node/page/${HOMEPAGE_NODE_ID}`,
                {
                  data: {
                    type: 'node--page',
                    id: HOMEPAGE_NODE_ID.toString(),
                    attributes: {
                      title: 'Homepage',
                      body: {
                        value: sanitizedText,
                        format: 'full_html',
                      },
                    },
                  },
                },
                {
                  headers: {
                    'Content-Type': 'application/vnd.api+json',
                    'Accept': 'application/vnd.api+json',
                    ...(username && password && {
                      'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
                    })
                  },
                }
              );
              console.log('\n=== NODE UPDATE RESPONSE ===');
              console.log('Status:', nodeUpdateResponse.status, nodeUpdateResponse.statusText);
              console.log('Response Headers:', JSON.stringify(nodeUpdateResponse.headers, null, 2));
              console.log('Response Data:', JSON.stringify(nodeUpdateResponse.data, null, 2));

              // Now update the homepage content using the Intelligensi Bridge import-nodes endpoint
              console.log(`\n=== UPDATING HOMEPAGE CONTENT ===`);
              const importEndpoint = `${baseUrl}/api/import-nodes`;
              console.log('Using endpoint:', importEndpoint);
              
              const nodeUpdate = [{
                id: 19, // Hardcoded homepage node ID
                type: "page",
                title: "Homepage",
                field_body: [{
                  value: sanitizedText,
                  format: "basic_html"
                }]
              }];

              console.log('Request Payload:', JSON.stringify(nodeUpdate, null, 2));

              // Update the node content
              const drupalResponse = await axios.post(
                importEndpoint,
                nodeUpdate,
                { 
                  headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    ...(username && password && {
                      "Authorization": `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
                    })
                  }
                }
              );
              
              console.log('\n=== HOMEPAGE UPDATE RESPONSE ===');
              console.log('Status:', drupalResponse.status, drupalResponse.statusText);
              console.log('Response Data:', JSON.stringify(drupalResponse.data, null, 2));

              res.status(200).json({
                message: 'Drupal 11 homepage content updated successfully',
                nodeId: 19,
                drupalResponse: drupalResponse.data,
              });
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              const errorResponse = (error as { response?: { data?: unknown } })?.response?.data;
              console.error('Error updating node:', errorResponse || errorMessage);
              throw new Error(`Failed to update node: ${errorMessage}`);
            }
          } else {
            // Default to Drupal 7 behavior if cmsVersion is not 'drupal11'
            console.log('\n=== UPDATING DRUPAL 7 HOMEPAGE ===');
            const drupalEndpoint = `${baseUrl}/api/update-homepage`;
            console.log(`Sending update to Drupal 7 endpoint: ${drupalEndpoint}`);
            
            const drupalResponse = await axios.post(
              drupalEndpoint,
              { update_text: sanitizedText },
              { 
                headers: { 
                  "Content-Type": "application/json" 
                },
                ...(username && password && {
                  auth: { username, password }
                })
              }
            );
            
            console.log('\n=== DRUPAL 7 RESPONSE ===');
            console.log('Status:', drupalResponse.status, drupalResponse.statusText);
            console.log('Response Data:', JSON.stringify(drupalResponse.data, null, 2));

            res.status(200).json({
              message: 'Drupal 7 homepage updated successfully',
              drupalResponse: drupalResponse.data,
            });
          }
        } catch (parseError) {
          console.error("Error parsing function arguments:", parseError);
          res.status(500).json({ error: "Error parsing function arguments." });
          return;
        }
      } else {
        const message = openAIResponse.data.choices?.[0]?.message?.content ||
          "Could not determine the homepage update.";
        res.status(200).json({ message });
      }
    } catch (error) {
      console.error("API error:", error instanceof AxiosError ? error.response?.data : error);
      res.status(500).json({
        error: "Failed to process your request.",
        details: error instanceof AxiosError ? error.response?.data :
          error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);