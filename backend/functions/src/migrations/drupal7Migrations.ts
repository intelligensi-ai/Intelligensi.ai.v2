import express from "express";
import axios from "axios";
import https from "https";
import { exec } from "child_process";

const router = express.Router();

/**
 * Creates an HTTPS agent to ignore SSL certificate errors
 */
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Ignore certificate validation
});

/**
 * Simple hello world endpoint ERROR
 *
 *
 * @param req - Express request object
 * @param res - Express response object
 */
router.get("/hello", function(req: express.Request, res: express.Response) {
  res.send("hello world");
});

/**
 * Fetch JSON data for nodes from Drupal 7
 * @param req - Express request object with query params: endpoint, username, password
 * @param res - Express response object
 */
router.get("/transmit", async function(req: express.Request, res: express.Response) {
  const { endpoint, username, password } = req.query;
  const fullEndpoint = `${endpoint}/drupal7-transmit`;

  try {
    const response = await axios.get(fullEndpoint, {
      auth: { username: username as string, password: password as string },
      httpsAgent, // Use the HTTPS agent
    });
    res.json(response.data);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching node data:", error.message);
    } else {
      console.error("Error fetching node data:", error);
    }
    res.status(500).json({ error: "Failed to fetch node data" });
  }
});

/**
 * Fetch JSON site info from Drupal 7
 * @param req - Express request object with query params: endpoint, username, password
 * @param res - Express response object
 */
router.get("/info", async function(req: express.Request, res: express.Response) {
  const { endpoint, username, password } = req.query;
  const fullEndpoint = `${endpoint}/drupal7-info`;

  try {
    const response = await axios.get(fullEndpoint, {
      auth: { username: username as string, password: password as string },
      httpsAgent, // Use the HTTPS agent
    });
    res.json(response.data);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching site info:", error.message);
    } else {
      console.error("Error fetching site info:", error);
    }
    res.status(500).json({ error: "Failed to fetch site info" });
  }
});

/**
 * Fetch site structure from Drupal 7
 * @param req - Express request object with query params: endpoint, _t (cache buster)
 * @param res - Express response object
 */
router.get("/structure", async function(req: express.Request, res: express.Response) {
  const { endpoint, _t } = req.query;
  
  if (!endpoint) {
    console.error('[structure] Missing required parameter: endpoint');
    return res.status(400).json({ error: 'Missing required parameter: endpoint' });
  }

  // Ensure the endpoint ends with a slash
  const baseUrl = endpoint.toString().endsWith('/') 
    ? endpoint.toString() 
    : `${endpoint}/`;
  
  const drupalUrl = `${baseUrl}api/bulk-export`;
  console.log(`[structure] Fetching content from: ${drupalUrl}`);

  try {
    // First try direct axios request
    try {
      const response = await axios.get(drupalUrl, {
        httpsAgent,
        timeout: 30000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.data) {
        throw new Error('Empty response from Drupal site');
      }
      
      console.log(`[structure] Successfully fetched ${Array.isArray(response.data) ? response.data.length : '1'} items`);
      return res.json(response.data);
    } catch (axiosError) {
      console.warn('[structure] Axios request failed, falling back to curl:', axiosError.message);
    }
    
    // Fallback to curl if axios fails
    const command = `curl -sSLk "${drupalUrl}"`;
    console.log(`[structure] Executing fallback command: ${command}`);

    const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`[structure] Error executing curl: ${error.message}`);
          console.error(`[structure] Curl stderr: ${stderr}`);
          reject(new Error(`Drupal request failed: ${error.message}${stderr ? `\nStderr: ${stderr}` : ""}`));
        } else {
          if (stderr) {
            console.warn(`[structure] Curl stderr (non-fatal): ${stderr}`);
          }
          resolve({ stdout, stderr });
        }
      });
    });

    // stdout (and potentially non-fatal stderr) are available here if exec was successful
    const structureData = JSON.parse(stdout);
    console.log("[structure_curl] Successfully fetched and parsed data via curl.");
    res.json({ structure: structureData });
  } catch (e) {
    const execError = e as Error; // Type assertion
    console.error(`[structure_curl] Caught exec error: ${execError.message}`);

    // Note: stderr is now part of execError.message if it came from the promise rejection
    // If you need to send it separately, it would require a more complex error object.
    res.status(500).json({
      error: "Failed to execute command to fetch Drupal structure.",
      details: execError.message,
      // stderrOutput: "See details for stderr if present" // Or parse from execError.message if needed
    });
  }
});

export default router;
