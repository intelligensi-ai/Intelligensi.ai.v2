import { Request, Response, Router } from "express";
import axios, { AxiosRequestConfig } from "axios";
import https from "https";

// Create and configure the router
const router: Router = Router();

// Middleware to log all requests
router.use((req, res, next) => {
  console.log(`[D11] ${req.method} ${req.path}`, req.query);
  next();
});

// Export the router as a named export
export const drupal11Router = router;

// Interface for Drupal 11 node data
export interface DrupalNode {
  id: number;
  type: string;
  title: string;
  created: number;
  changed: number;
  status: boolean;
  url: string;
  [key: string]: string | number | boolean | null | undefined | unknown[]
    | Record<string, unknown>; // For dynamic fields
}

// Interface for import/export results
interface ImportResult {
  created: number;
  updated: number;
  errors: number;
  details: string[];
}

// Bulk export response type will be dynamically handled

// Interface for site info response
interface SiteInfo {
  name: string;
  slogan: string;
  email: string;
  status: boolean;
}

/**
 * Creates an HTTPS agent to ignore SSL certificate errors
 */
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Ignore certificate validation
});

/**
 * Creates an authenticated Axios client for interacting with Drupal 11
 * @param {string} baseURL - The base URL of the Drupal 11 site
 * @param {string} [username] - Optional username for basic authentication
 * @param {string} [password] - Optional password for basic authentication
 * @return {Promise<Object>} Axios instance configured for Drupal 11
 */
function createDrupalClient(baseURL: string, username?: string, password?: string) {
  const config: AxiosRequestConfig = {
    baseURL,
    httpsAgent,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    },
    withCredentials: false,
    timeout: 30000, // 30 second timeout
    validateStatus: (status) => status < 500 // Don't throw for 4xx errors
  };

  // Add basic auth if credentials are provided
  if (username && password) {
    config.auth = {
      username,
      password,
    };
  }

  const client = axios.create(config);
  
  // Add request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      console.log(`Making request to: ${config.baseURL}${config.url}`);
      return config;
    },
    (error) => {
      console.error('Request error:', error);
      return Promise.reject(error);
    }
  );
  
  return client;
}

/**
 * Get site information from Drupal 11
 */
// Get site information from Drupal 11
// Get site information from Drupal 11
router.get("/info", async (req: Request, res: Response): Promise<void> => {
  try {
    // Use the same hardcoded endpoint as the /structure endpoint
    const hardcodedEndpoint = 'https://umami-intelligensi.ai.ddev.site';
    const { username, password } = req.query;
    
    console.log('Fetching site info from:', hardcodedEndpoint);
    
    const client = createDrupalClient(
      hardcodedEndpoint, 
      username as string, 
      password as string
    );
    
    console.log('Making request to:', `${hardcodedEndpoint}/intelligensi-bridge/site-info`);
    const response = await client.get<SiteInfo>("/intelligensi-bridge/site-info");
    
    console.log('Site info response status:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching site info:", error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers,
        data: error.response?.data
      });
    }
    res.status(500).json({ 
      error: "Failed to fetch site info", 
      details: error instanceof Error ? error.message : String(error),
      axiosError: axios.isAxiosError(error) ? {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      } : undefined
    });
  }
});

/**
 * Update homepage in Drupal 11
 */
// Update homepage in Drupal 11
router.post("/homepage", async (req: Request, res: Response): Promise<void> => {
  console.log('[D11] /homepage endpoint called with body:', req.body);
  
  const { nid, content } = req.body;
  const hardcodedEndpoint = 'https://umami-intelligensi.ai.ddev.site';
  const username = 'admin';
  const password = 'admin';

  if (!nid) {
    console.error('[D11] Error: nid is required');
    res.status(400).json({ error: "Node ID (nid) is required" });
    return;
  }

  try {
    console.log(`[D11] Updating node ${nid} at ${hardcodedEndpoint}`);
    
    // Create axios instance with base config
    const client = axios.create({
      baseURL: hardcodedEndpoint,
      withCredentials: true,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    // 1. Log in to get session cookie
    console.log('[D11] Logging in to Drupal...');
    await client.post('/user/login', 
      `name=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // 2. Get CSRF token
    console.log('[D11] Getting CSRF token...');
    const tokenResponse = await client.get('/session/token');
    const csrfToken = tokenResponse.data;

    // 3. Create a new client with JSON:API headers
    const jsonApiClient = axios.create({
      baseURL: hardcodedEndpoint,
      auth: {
        username: username,
        password: password
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        'X-CSRF-Token': csrfToken
      }
    });

    // 4. First, get the node to update
    console.log(`[D11] Fetching node ${nid}...`);
    const nodeResponse = await jsonApiClient.get(`/jsonapi/node/article/${nid}?include=field_tags,field_image`);
    const nodeData = nodeResponse.data.data;

    // 5. Prepare updated node for JSON:API
    const updatedNode = {
      data: {
        type: 'node--article',
        id: nid,
        attributes: {
          title: content,
          body: {
            value: content,
            format: 'basic_html',
            summary: ''
          }
        }
      }
    };
    
    // 6. Send the update using JSON:API
    console.log(`[D11] Updating node ${nid}...`);
    const response = await jsonApiClient.patch(
      `/jsonapi/node/article/${nid}`,
      updatedNode.data,
      {
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        }
      }
    );

    console.log(`[D11] Homepage update response:`, response.status, response.statusText);
    res.json({
      success: true,
      message: "Homepage updated successfully",
      data: response.data,
      source: hardcodedEndpoint
    });
  } catch (error) {
    console.error("[D11] Error updating homepage:", error);
    
    if (axios.isAxiosError(error)) {
      console.error('[D11] Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
    
    res.status(500).json({
      error: "Failed to update homepage",
      details: error instanceof Error ? error.message : String(error),
      axiosError: axios.isAxiosError(error) ? {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      } : undefined
    });
  }
});

/**
 * Bulk export nodes from Drupal 11
 */
// Get site structure from Drupal 11 using hardcoded endpoint
router.get("/structure", async (req: Request, res: Response): Promise<void> => {
  console.log('[D11] /structure endpoint called');
  try {
    // Hardcoded endpoint for testing
    const hardcodedEndpoint = 'https://umami-intelligensi.ai.ddev.site/api/bulk-export';
    console.log('Using hardcoded endpoint:', hardcodedEndpoint);
    
    // Create client with the hardcoded endpoint as base URL
    const client = axios.create({
      baseURL: hardcodedEndpoint,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // Don't throw for any status
    });
    
    console.log('Making request to:', hardcodedEndpoint);
    const response = await client.get('');
    console.log('Response status:', response.status);
    
    if (response.status === 200 && response.data) {
      console.log('Successfully fetched data');
      res.json({
        status: 'success',
        data: response.data,
        source: hardcodedEndpoint
      });
      return;
    }
    
    throw new Error(`Endpoint returned status ${response.status}`);
  } catch (error) {
    console.error("Error fetching site structure:", error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers,
        data: error.response?.data
      });
    }
    res.status(500).json({
      error: "Failed to fetch site structure",
      details: error instanceof Error ? error.message : String(error),
      axiosError: axios.isAxiosError(error) ? {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      } : undefined
    });
  }
});

/**
 * Import nodes into Drupal 11
 */
// Import nodes into Drupal 11
// Import nodes to Drupal 11
router.post("/import", async (req: Request, res: Response): Promise<void> => {
  const { endpoint, username, password, nodes } = req.body;

  if (!endpoint || !nodes) {
    res.status(400).json({ error: "Endpoint and nodes are required" });
    return;
  }

  try {
    const client = createDrupalClient(endpoint, username, password);
    const response = await client.post<ImportResult>("/intelligensi-bridge/bulk-import", {
      nodes,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error importing nodes:", error);
    res.status(500).json({
      error: "Failed to import nodes",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Backward compatibility endpoint
router.get("/transmit", (req: Request, res: Response): void => {
  // Forward to the structure endpoint for backward compatibility
  const { ...queryParams } = req.query;
  const queryString = new URLSearchParams(
    queryParams as Record<string, string>
  ).toString();
  res.redirect(`/structure?${queryString}`);
});

// Health check endpoint
router.get("/hello", (_: Request, res: Response): void => {
  res.json({ message: "Drupal 11 Bridge is running" });
});
