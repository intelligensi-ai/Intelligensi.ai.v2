import { Request, Response, Router } from "express";
import axios, { AxiosRequestConfig } from "axios";
import https from "https";

// Create and configure the router
const router: Router = Router();

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

// Interface for bulk export response
interface BulkExportResponse {
  status: string;
  count: number;
  next: string | null;
  data: DrupalNode[];
}

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
    },
  };

  // Add basic auth if credentials are provided
  if (username && password) {
    config.auth = {
      username,
      password,
    };
  }

  return axios.create(config);
}

/**
 * Get site information from Drupal 11
 */
// Get site information from Drupal 11
// Get site information from Drupal 11
router.get("/info", async (req: Request, res: Response): Promise<void> => {
  const { endpoint, username, password } = req.query;
  if (!endpoint) {
    res.status(400).json({ error: "Endpoint is required" });
    return;
  }
  try {
    const client = createDrupalClient(endpoint as string, username as string, password as string);
    const response = await client.get<SiteInfo>("/intelligensi-bridge/site-info");
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching site info:", error);
    res.status(500).json({
      error: "Failed to fetch site info",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Update homepage in Drupal 11
 */
// Update homepage in Drupal 11
router.post("/homepage", async (req: Request, res: Response): Promise<void> => {
  const { endpoint, username, password, nid } = req.body;

  if (!endpoint || !nid) {
    res.status(400).json({
      error: "Endpoint and node ID (nid) are required",
    });
    return;
  }

  try {
    const client = createDrupalClient(endpoint, username, password);
    const response = await client.post("/intelligensi-bridge/update-homepage", { nid });
    res.json(response.data);
  } catch (error) {
    console.error("Error updating homepage:", error);
    res.status(500).json({
      error: "Failed to update homepage",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Bulk export nodes from Drupal 11
 */
// Bulk export nodes from Drupal 11
router.get("/structure", async (req: Request, res: Response): Promise<void> => {
  const { endpoint, username, password, limit, offset } = req.query;

  if (!endpoint) {
    res.status(400).json({ error: "Endpoint is required" });
    return;
  }

  try {
    const client = createDrupalClient(endpoint as string, username as string, password as string);
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit as string);
    if (offset) params.append("offset", offset as string);

    const response = await client.get<BulkExportResponse>(
      `/intelligensi-bridge/bulk-export?${params.toString()}`
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching site structure:", error);
    res.status(500).json({
      error: "Failed to fetch site structure",
      details: error instanceof Error ? error.message : String(error),
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
