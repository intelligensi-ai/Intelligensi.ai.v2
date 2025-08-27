// functions/src/generateAndUploadImage.ts
import axios from "axios";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Your function implementation here
export const generateAndUploadImage = functions.https.onRequest(async (request, response) => {
  try {
    // Your function logic here
    response.status(200).json({ message: 'Function executed successfully' });
  } catch (error) {
    console.error('Error:', error);
    response.status(500).json({ error: 'Something went wrong' });
  }
});


const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Drupal 11 config
const DRUPAL_BASE = "https://your-drupal-site.com";
const DRUPAL_USER = "firebase_user";
const DRUPAL_PASS = process.env.DRUPAL_PASS; // store in Firebase env

export const generateAndUploadImage = functions.https.onCall(async (data, context) => {
  try {
    const { description, nodeId } = data;
    if (!description || !nodeId) {
      throw new Error("description and nodeId are required");
    }

    // 1. Generate image with OpenAI
    const imageResult = await openai.images.generate({
      model: "gpt-image-1",
      prompt: description,
      size: "1024x1024",
    });

    const imageUrl = imageResult.data[0].url;
    if (!imageUrl) throw new Error("Failed to generate image");

    // Fetch the actual image file
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // 2. Upload image to Drupal
    const formData = new FormData();
    formData.append("files[file]", imageBuffer, {
      filename: "recipe-image.png",
      contentType: "image/png",
    });

    const uploadResponse = await fetch(`${DRUPAL_BASE}/jsonapi/file/image/upload`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${DRUPAL_USER}:${DRUPAL_PASS}`).toString("base64"),
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Image upload failed: ${uploadResponse.statusText}`);
    }

    const fileJson = await uploadResponse.json();
    const fileId = fileJson.data.id;

    // 3. Patch the node to set the image field
    const patchResponse = await fetch(`${DRUPAL_BASE}/jsonapi/node/recipe/${nodeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/vnd.api+json",
        Authorization: "Basic " + Buffer.from(`${DRUPAL_USER}:${DRUPAL_PASS}`).toString("base64"),
      },
      body: JSON.stringify({
        data: {
          type: "node--recipe",
          id: nodeId,
          relationships: {
            field_image: {
              data: {
                type: "file--file",
                id: fileId,
              },
            },
          },
        },
      }),
    });

    if (!patchResponse.ok) {
      throw new Error(`Failed to attach image to node: ${patchResponse.statusText}`);
    }

    return { success: true, nodeId, fileId };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
});
