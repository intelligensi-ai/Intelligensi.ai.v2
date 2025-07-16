import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import * as dotenv from "dotenv";
import axios from "axios";

// Define secrets
const weaviateUrlSecret = defineSecret('WEAVIATE_URL');
const weaviateApiKeySecret = defineSecret('WEAVIATE_API_KEY');
const openaiApiKeySecret = defineSecret('OPENAI_API_KEY');

// Load environment variables from .env file for local development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: `${process.cwd()}/.env` });
}

// Environment variables - will be overridden by Firebase secrets in production
let weaviateUrl = process.env.WEAVIATE_URL || '';
let weaviateApiKey = process.env.WEAVIATE_API_KEY || '';
let openaiApiKey = process.env.OPENAI_API_KEY || '';

// Create axios instance for Weaviate API calls
let weaviateAxios = axios.create();

// Helper function to send error responses
const sendError = (res: any, status: number, message: string, details?: any) => {
  logger.error(message, { status, details });
  res.status(status).json({
    success: false,
    error: message,
    details: process.env.NODE_ENV === 'development' ? details : undefined,
  });};

const updateWeaviateAxios = (url: string, apiKey: string, openAiKey: string) => {
  // Ensure the URL has a scheme
  let baseUrl = url.trim();
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  
  // Remove any trailing slashes
  baseUrl = baseUrl.replace(/\/+$/, '');
  
  logger.info('Updating Weaviate client with URL:', { baseUrl: baseUrl });
  
  weaviateAxios = axios.create({
    baseURL: baseUrl,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-OpenAI-Api-Key': openAiKey,
      'Content-Type': 'application/json',
    },
  });
};

// Initialize with environment variables if available
if (weaviateUrl && weaviateApiKey && openaiApiKey) {
  updateWeaviateAxios(weaviateUrl, weaviateApiKey, openaiApiKey);
}

const checkWeaviateConnection = async (): Promise<boolean> => {
  try {
    const currentWeaviateUrl = weaviateUrlSecret.value() || weaviateUrl;
    const currentWeaviateApiKey = weaviateApiKeySecret.value() || weaviateApiKey;
    
    if (!currentWeaviateUrl) {
      throw new Error("WEAVIATE_URL is not configured");
    }
    if (!currentWeaviateApiKey) {
      throw new Error("WEAVIATE_API_KEY is not configured");
    }
    
    logger.info(`Weaviate URL: ${currentWeaviateUrl}`);
    logger.info('Weaviate API Key: ' + (currentWeaviateApiKey ? '***' + currentWeaviateApiKey.slice(-4) : 'Not set'));

    logger.info('Checking Weaviate connection...');
    
    // Normalize URL - ensure it has https:// and no trailing slash
    let normalizedUrl = currentWeaviateUrl.trim();
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    normalizedUrl = normalizedUrl.replace(/\/+$/, ''); // Remove trailing slashes

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const testUrl = `${normalizedUrl}/v1/.well-known/ready`;
      logger.info(`Testing connection to: ${testUrl}`);
      
      const response = await axios.get(testUrl, {
        headers: {
          'Authorization': `Bearer ${currentWeaviateApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      
      clearTimeout(timeout);
      
      if (!response.status) {
        const errorText = response.statusText || 'No response status text';
        throw new Error(`Weaviate returned status ${response.status}: ${errorText}`);
      }
      
      const data = response.data;
      logger.info('Weaviate response:', { status: response.status, data });
      
      if (data?.status !== 'ready') {
        throw new Error('Weaviate is not ready');
      }
      
      logger.info('Successfully connected to Weaviate');
      return true;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Connection to Weaviate timed out after 10 seconds');
        }
        if ('code' in error) {
          // Handle Node.js system errors (like ENOTFOUND, ECONNREFUSED)
          throw new Error(`Network error (${error.code}): ${error.message}`);
        }
        throw error; // Re-throw the error to be caught by the outer try-catch
      }
      throw new Error('Unknown error connecting to Weaviate');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to connect to Weaviate:", errorMessage);
    throw new Error(`Failed to connect to Weaviate: ${errorMessage}`);
  }
};

// Declare global type for TypeScript
declare global {
  // eslint-disable-next-line no-var
  var globalOptionsSet: boolean | undefined;
}

// Set global options for the function - only once
if (!global.globalOptionsSet) {
  setGlobalOptions({
    region: "us-central1",
    maxInstances: 10,
    memory: "1GiB",
    secrets: ["OPENAI_API_KEY", "WEAVIATE_URL", "WEAVIATE_API_KEY"],
  });
  global.globalOptionsSet = true;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper to parse request body
const parseRequestBody = (req: any): any => {
  if (req.method !== 'POST') return {};
  
  const contentType = req.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Content-Type must be application/json');
  }
  
  try {
    if (typeof req.body === 'string') {
      return JSON.parse(req.body);
    } else if (typeof req.body === 'object' && req.body !== null) {
      return req.body;
    } else {
      throw new Error('Invalid request body');
    }
  } catch (error) {
    throw new Error(`Failed to parse request body: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const simpleSearch = onRequest(
  {
    secrets: [weaviateUrlSecret.name, weaviateApiKeySecret.name, openaiApiKeySecret.name],
  },
  async (req, res) => {
    // Set CORS headers for all responses
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.set(key, value);
    });

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      // Use secrets if available, otherwise fall back to environment variables
      const currentWeaviateUrl = weaviateUrlSecret.value() || weaviateUrl;
      const currentWeaviateApiKey = weaviateApiKeySecret.value() || weaviateApiKey;
      const currentOpenaiApiKey = openaiApiKeySecret.value() || openaiApiKey;
      
      // Update axios instance with the latest values
      updateWeaviateAxios(currentWeaviateUrl, currentWeaviateApiKey, currentOpenaiApiKey);
      
      // Log the configuration (without sensitive data)
      logger.info('Weaviate URL:', { url: currentWeaviateUrl ? 'configured' : 'missing' });
      
      // Check Weaviate connection
      try {
        await checkWeaviateConnection();
      } catch (error) {
        let errorMessage = 'Unknown error';
        let errorDetails: any = {};
        
        if (axios.isAxiosError(error)) {
          errorMessage = `Axios error: ${error.message}`;
          if (error.response) {
            errorDetails = {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
              headers: error.response.headers
            };
          } else if (error.request) {
            errorDetails = { request: 'No response received', config: error.config };
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
          errorDetails = { stack: error.stack };
        } else {
          errorMessage = String(error);
        }
        
        logger.error('Failed to connect to Weaviate:', { error: errorMessage, details: errorDetails });
        return sendError(res, 500, 'Failed to connect to Weaviate', { error: errorMessage });
      }
      
      // Parse the request
      let query: string;

      try {
        if (req.method === 'GET') {
          query = req.query.query as string;
        } else if (req.method === 'POST') {
          const body = parseRequestBody(req);
          query = body.query;
        } else {
          return sendError(res, 405, 'Method not allowed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Invalid request';
        return sendError(res, 400, errorMessage);
      }

      if (!query) {
        return sendError(res, 400, 'Query parameter "query" is required');
      }

      logger.info(`Executing search with query: "${query}"`);
      
      let schemaResponse;
      try {
        logger.info('Fetching Weaviate schema...');
        schemaResponse = await weaviateAxios.get('/v1/schema', {
          timeout: 10000, // 10 second timeout
        });
        logger.info('Successfully fetched Weaviate schema');
      } catch (error) {
        let errorDetails = {};
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNABORTED') {
            return sendError(res, 504, 'Schema request timed out after 10 seconds');
          }
          if (error.response) {
            errorDetails = {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
              headers: error.response.headers
            };
            return sendError(res, error.response.status, 'Failed to fetch Weaviate schema', errorDetails);
          } else if (error.request) {
            return sendError(res, 503, 'No response received from Weaviate when fetching schema');
          }
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return sendError(res, 500, `Failed to fetch Weaviate schema: ${errorMessage}`, errorDetails);
      }
      
      const classNames = schemaResponse.data.classes?.map((c: any) => c.class) || [];
      
      if (classNames.length === 0) {
        return sendError(res, 404, 'No classes found in Weaviate schema');
      }
      
      // Use the first available class for the search
      const className = classNames[0];
      logger.info(`Searching in class: ${className}`);
      
      // Execute the search using Weaviate's GraphQL API
      const graphqlQuery = {
        query: `
          {
            Get {
              ${className} (
                nearText: {
                  concepts: ["${query.replace(/"/g, '\\"')}"]
                },
                limit: 5
              ) {
                title
                content
                url
                _additional {
                  id
                  distance
                }
              }
            }
          }`
      };
      
      logger.info('Executing GraphQL query:', JSON.stringify(graphqlQuery, null, 2));
      
      let result;
      try {
        const startTime = Date.now();
        result = await weaviateAxios.post('/v1/graphql', graphqlQuery, {
          timeout: 30000, // 30 second timeout for search
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const duration = Date.now() - startTime;
        logger.info(`GraphQL search completed in ${duration}ms`);
      } catch (error) {
        let errorDetails = {};
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNABORTED') {
            return sendError(res, 504, 'Search request timed out after 30 seconds');
          }
          if (error.response) {
            errorDetails = {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
              headers: error.response.headers
            };
            return sendError(res, error.response.status, 'Failed to execute search', errorDetails);
          } else if (error.request) {
            return sendError(res, 503, 'No response received from Weaviate during search');
          }
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return sendError(res, 500, `Search failed: ${errorMessage}`, errorDetails);
      }
      
      if (result.data.errors) {
        const errorMessage = `Weaviate GraphQL errors: ${JSON.stringify(result.data.errors)}`;
        logger.error(errorMessage);
        return sendError(res, 500, 'GraphQL query error', { errors: result.data.errors });
      }
      
      const items = result.data.data?.Get?.[className] || [];
      logger.info(`Found ${items.length} items matching query`);
      
      res.status(200).json({
        success: true,
        results: items.map((item: any) => ({
          id: item._additional?.id,
          title: item.title,
          content: item.content,
          url: item.url,
          distance: item._additional?.distance
        })),
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Error in simpleSearch:", error);
      
      // Handle different types of errors
      if (errorMessage.includes("404") || errorMessage.includes("not found")) {
        return sendError(res, 404, "The requested resource was not found", errorMessage);
      } else if (errorMessage.includes("connection") || errorMessage.includes("ECONN")) {
        return sendError(res, 503, "Search service is currently unavailable", errorMessage);
      } else {
        // Generic error response
        return sendError(res, 500, "Failed to perform search", errorMessage);
      }
    }
  }
);
