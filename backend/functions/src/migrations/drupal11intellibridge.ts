import express, { Request, Response, NextFunction } from "express";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import https from "https";
import { exec } from "child_process";

const router = express.Router();

/**
 * Creates an HTTPS agent to ignore SSL certificate errors
 */
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Ignore certificate validation
});

// Middleware to log all requests
router.use((req: Request, res: Response, next: NextFunction): void => {
  console.log(`[D11] ${req.method} ${req.path}`, req.query || req.body);
  next();
});

/**
 * Helper function to handle axios errors
 */
const handleAxiosError = (error: unknown, context: string): { status: number; error: string; details?: unknown } => {
  const err = error as AxiosError;
  console.error(`Error in ${context}:`, err.message);
  
  if (err.response) {
    console.error('Response status:', err.response.status);
    console.error('Response data:', err.response.data);
    return {
      status: err.response.status,
      error: `Failed to ${context}`,
      details: err.response.data
    };
  }
  
  return {
    status: 500,
    error: `Failed to ${context}`,
    details: err.message
  };
};

/**
 * Fetch JSON data for nodes from Drupal 11
 * @param req - Express request object with query params: endpoint, username, password
 * @param res - Express response object
 */
router.get("/transmit", async (req: Request, res: Response) => {
  const { endpoint, username, password } = req.query;
  
  if (!endpoint || !username || !password) {
    return res.status(400).json({ error: 'endpoint, username, and password are required' });
  }

  const fullEndpoint = `${endpoint}/jsonapi`; // Drupal 11 uses /jsonapi endpoint
  const config: AxiosRequestConfig = {
    auth: { 
      username: username as string, 
      password: password as string 
    },
    httpsAgent,
  };

  try {
    const response = await axios.get(fullEndpoint, config);
    return res.json(response.data);
  } catch (error) {
    const { status, ...errorData } = handleAxiosError(error, 'fetch node data');
    return res.status(status).json(errorData);
  }
});

/**
 * Fetch JSON site info from Drupal 11
 * @param req - Express request object with query params: endpoint, username, password
 * @param res - Express response object
 */
router.get("/info", async (req: Request, res: Response) => {
  const { endpoint, username, password } = req.query;
  
  if (!endpoint || !username || !password) {
    return res.status(400).json({ error: 'endpoint, username, and password are required' });
  }

  const fullEndpoint = `${endpoint}/jsonapi`; // Drupal 11 uses /jsonapi for site info
  const config: AxiosRequestConfig = {
    auth: { 
      username: username as string, 
      password: password as string 
    },
    httpsAgent,
  };

  try {
    const response = await axios.get(fullEndpoint, config);
    return res.json(response.data);
  } catch (error) {
    const { status, ...errorData } = handleAxiosError(error, 'fetch site info');
    return res.status(status).json(errorData);
  }
});

/**
 * Fetch site structure from Drupal 11 using curl
 * @param req - Express request object with query params: siteUrl
 * @param res - Express response object
 */
router.get("/structure", async (req: Request, res: Response): Promise<void> => {
  const { siteUrl } = req.query;
  
  if (!siteUrl || typeof siteUrl !== 'string') {
    res.status(400).json({ error: 'siteUrl parameter is required' });
    return;
  }

  // Ensure the URL has a protocol and ends with /jsonapi
  let drupalUrl = siteUrl.trim();
  if (!drupalUrl.startsWith('http://') && !drupalUrl.startsWith('https://')) {
    drupalUrl = `https://${drupalUrl}`;
  }
  
  // Remove any trailing slashes and append /jsonapi if not present
  drupalUrl = drupalUrl.replace(/\/+$/, '');
  if (!drupalUrl.endsWith('/jsonapi')) {
    drupalUrl = `${drupalUrl}/jsonapi`;
  }

  const command = `curl -sSLk "${drupalUrl}"`;
  console.log(`[structure_curl] Executing command: ${command}`);

  try {
    const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`[structure_curl] Error executing curl: ${error.message}`);
          console.error(`[structure_curl] Curl stderr: ${stderr}`);
          reject(new Error(`Exec error: ${error.message}${stderr ? `\nStderr: ${stderr}` : ""}`));
        } else {
          if (stderr) {
            console.warn(`[structure_curl] Curl stderr (non-fatal or warning): ${stderr}`);
          }
          resolve({ stdout, stderr });
        }
      });
    });

    const structureData = JSON.parse(stdout);
    console.log("[structure_curl] Successfully fetched and parsed data via curl.");
    res.json({ structure: structureData });
  } catch (e) {
    const execError = e as Error;
    console.error(`[structure_curl] Caught exec error: ${execError.message}`);

    res.status(500).json({
      error: "Failed to execute command to fetch Drupal structure.",
      details: execError.message,
    });
  }
});

  title: string;
  created: number;
  changed: number;
  status: boolean;
  url: string;
  [key: string]: string | number | boolean | null | undefined | unknown[] | Record<string, unknown>; // For dynamic fields
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
 * Creates an authenticated Axios client for interacting with Drupal 7
 * @param {string} baseURL - The base URL of the Drupal 7 site
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    withCredentials: false,
    timeout: 30000, // 30 second timeout
    validateStatus: (status) => status < 500, // Don't throw for 4xx errors
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
      console.error("Request error:", error);
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Get site information from Drupal 11
 */
router.get("/info", async (req: Request, res: Response): Promise<void> => {
  try {
    // Use the same hardcoded endpoint as the /structure endpoint
    const hardcodedEndpoint = "https://umami-intelligensi.ai.ddev.site";
    const { username, password } = req.query;

    const client = createDrupalClient(
      hardcodedEndpoint,
      username as string,
      password as string
    );

    const response = await client.get<SiteInfo>("/intelligensi-bridge/site-info");
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching site info:", error);
    if (isAxiosError(error)) {
      console.error("Request failed:", error.message);
    }
    res.status(500).json({
      error: "Failed to fetch site info",
      details: error instanceof Error ? error.message : String(error),
      axiosError: axios.isAxiosError(error) ? {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      } : undefined,
    });
  }
});

/**
 * Get site information from Drupal 11 using Intelligensi Bridge
 */
router.get("/info", async (req: Request, res: Response): Promise<void> => {
  const { siteUrl, username, password } = req.query;
  
  if (!siteUrl) {
    res.status(400).json({ error: "Site URL is required" });
    return;
  }

  try {
    const client = createDrupalClient(
      siteUrl as string,
      username as string | undefined,
      password as string | undefined
    );

    const response = await client.get("/intelligensi-bridge/site-info");
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching site info:", error);
    res.status(500).json({
      error: "Failed to fetch site info",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Update homepage in Drupal 11 using Intelligensi Bridge
 */
router.post("/homepage", async (req: Request, res: Response): Promise<void> => {
  const { nid, siteUrl, username, password } = req.body;
  
  if (!nid) {
    console.error("[D11] Error: nid is required");
    res.status(400).json({ error: "Node ID (nid) is required" });
    return;
  }
  
  if (!siteUrl) {
    console.error("[D11] Error: siteUrl is required");
    res.status(400).json({ error: "Site URL is required" });
    return;
  }

  try {
    const client = createDrupalClient(
      siteUrl,
      username,
      password
    );

    // Use the Intelligensi Bridge endpoint to update homepage
    const response = await client.post(
      "/intelligensi-bridge/update-homepage",
      { nid: Number(nid) },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      }
    );

    res.json({
      success: true,
      message: "Homepage updated successfully",
      data: response.data,
      source: siteUrl,
    });
  } catch (error) {
    console.error("[D11] Error updating homepage:", error);
    
    let errorDetails = "Failed to update homepage";
    let statusCode = 500;
    
    if (isAxiosError(error)) {
      console.error("[D11] Axios error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      
      statusCode = error.response?.status || 500;
      errorDetails = error.response?.data?.message || error.message;
    }

    res.status(statusCode).json({
      error: "Failed to update homepage",
      details: errorDetails,
      status: statusCode
    });
  }
});

/**
 * Bulk export nodes from Drupal 11 using Intelligensi Bridge
 */
router.get("/export", async (req: Request, res: Response): Promise<void> => {
  try {
    const { siteUrl, username, password, types, limit, start, fields } = req.query;

    if (!siteUrl) {
      res.status(400).json({ error: "Missing required parameter: siteUrl" });
      return;
    }

    // Build the API URL with parameters
    let apiUrl = siteUrl as string;
    if (!apiUrl.endsWith('/')) apiUrl += '/';
    apiUrl += 'intelligensi-bridge/bulk-export';

    // Build the curl command with parameters
    const params: string[] = [];
    if (types) params.push(`types=${encodeURIComponent(types as string)}`);
    if (limit) params.push(`limit=${encodeURIComponent(limit as string)}`);
    if (start) params.push(`start=${encodeURIComponent(start as string)}`);
    if (fields) params.push(`fields=${encodeURIComponent(fields as string)}`);
    
    if (params.length > 0) {
      apiUrl += '?' + params.join('&');
    }

    // Build the curl command with basic auth if credentials are provided
    let curlCommand = 'curl -sSLk';
    if (username && password) {
      curlCommand += ` -u ${username}:${password}`;
    }
    curlCommand += ` "${apiUrl}"`;

    console.log(`[drupal11_curl] Executing command: ${curlCommand}`);

    // Execute the curl command
    const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      exec(curlCommand, (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          console.error(`[drupal11_curl] Error executing curl: ${error.message}`);
          console.error(`[drupal11_curl] Curl stderr: ${stderr}`);
          reject(new Error(`Exec error: ${error.message}${stderr ? `\nStderr: ${stderr}` : ""}`));
        } else {
          // Even if exec error is null, stderr might contain warnings, log them
          if (stderr) {
            console.warn(`[drupal11_curl] Curl stderr (non-fatal or warning): ${stderr}`);
          }
          resolve({ stdout, stderr });
        }
      });
    });

    // Parse the response
    const data = JSON.parse(stdout);

    // If we have data and this is not a partial export, try to create a schema
    if (data && Array.isArray(data) && data.length > 0 && !limit) {
      try {
        // Get the site ID from the request or use a default
        const siteId = req.query.siteId || 'drupal11-' + siteUrl;
        const cmsId = 2; // Drupal 11 CMS ID
        
        // Import the schema creation function
        const { createSchema } = await import('../routes/schemaRoutes');
        
        // Create a mock response object to capture the schema creation result
        let schemaResult: any = null;
        const mockRes = {
          status: (code: number) => ({
            json: (result: any) => {
              schemaResult = { status: code, data: result };
              return mockRes;
            }
          })
        };
        
        // Create a payload for schema creation
        const schemaPayload = {
          siteId: siteId,
          cmsId: cmsId,
          examplePayload: { structure: data.slice(0, 5) }, // Use first 5 items for schema
          description: `Auto-generated schema for Drupal 11 site ${siteUrl}`,
          version: '1.0.0',
          createdBy: 'system'
        };
        
        // Call the schema creation function directly
        await createSchema(
          { method: 'POST', body: schemaPayload } as any,
          mockRes as any
        );
        
        if (schemaResult && schemaResult.status === 200) {
          console.log('Successfully created schema for Drupal 11 site:', siteId);
        } else {
          console.warn('Failed to create schema for Drupal 11 site:', schemaResult);
        }
      } catch (schemaError) {
        console.error('Error creating schema for Drupal 11 site:', schemaError);
        // Don't fail the entire request if schema creation fails
      }
    }
    
    res.json({
      success: true,
      data: data,
      message: 'Nodes exported successfully'
    });
  } catch (error) {
    console.error("Error exporting nodes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export nodes",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Import nodes to Drupal 11 using Intelligensi Bridge
 * 
 * Example cURL command:
 * curl -X POST https://umami-intelligensi.ai.ddev.site/api/import-nodes \
 *   -H "Content-Type: application/json" \
 *   -d '[{"id":19,"type":"page","title":"Test Update","field_body":[{"value":"<p>test</p>","format":"basic_html"}]}]'
 */
router.post("/import", async (req: Request, res: Response): Promise<void> => {
  const { siteUrl, username, password, nodes } = req.body;
  
  if (!siteUrl) {
    res.status(400).json({ error: "Site URL is required" });
    return;
  }
  
  if (!nodes || !Array.isArray(nodes)) {
    res.status(400).json({ error: "Nodes array is required" });
    return;
  }

  try {
    const client = createDrupalClient(siteUrl, username, password);
    
    // Log the import request
    console.log(`[D11] Importing ${nodes.length} nodes to ${siteUrl}`);
    console.log(`[D11] First node ID: ${nodes[0]?.id || 'N/A'}`);
    
    // Make the request to Drupal's import-nodes endpoint
    const response = await client.post('/api/import-nodes', nodes, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Log successful import
    console.log(`[D11] Import successful. Status: ${response.status}`);
    
    // Return the response data
    res.json({
      success: true,
      status: response.status,
      data: response.data
    });
    
  } catch (error) {
    console.error('[D11] Import error:', error);
    
    // Handle Axios errors
    if (isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        success: false,
        error: 'Failed to import nodes',
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    } else {
      // Handle other types of errors
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during import'
      });
    }
  }
});

/**
 * Bulk export nodes from Drupal 11
 */
router.get("/structure", async (req: Request, res: Response): Promise<void> => {
  try {
    // Hardcoded endpoint for testing
    const hardcodedEndpoint = "https://umami-intelligensi.ai.ddev.site/api/bulk-export";

    // Create client with the hardcoded endpoint as base URL
    const client = axios.create({
      baseURL: hardcodedEndpoint,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      validateStatus: () => true, // Don't throw for any status
    });

    const response = await client.get("");

    if (response.status === 200 && response.data) {
      res.json({
        status: "success",
        data: response.data,
        source: hardcodedEndpoint,
      });
      return;
    }

    throw new Error(`Endpoint returned status ${response.status}`);
  } catch (error) {
    console.error("Error fetching site structure:", error);
    if (isAxiosError(error)) {
      console.error("Request failed:", error.message);
    }
    res.status(500).json({
      error: "Failed to fetch site structure",
      details: error instanceof Error ? error.message : String(error),
      axiosError: axios.isAxiosError(error) ? {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      } : undefined,
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
