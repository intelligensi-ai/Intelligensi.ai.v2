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
 * Fetch site structure from Drupal 7 using curl
 * @param req - Express request object (endpoint query param is currently ignored)
 * @param res - Express response object
 */
router.get("/structure", async function(req: express.Request, res: express.Response) {
  const drupalUrl = "https://drupal7.intelligensi.online/api/bulk-export"; // Hardcoded target URL
  // curl options:
  // -s : silent mode (don't show progress meter or error messages from curl itself)
  // -S : when using -s, show error message if curl fails (though stderr handles this better)
  // -L : follow redirects
  // -k : allow insecure server connections when using SSL (useful if local SSL issues, but be cautious)
  const command = `curl -sSLk "${drupalUrl}"`; // Added -k for robustness, similar to rejectUnauthorized

  console.log(`[structure_curl] Executing command: ${command}`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`[structure_curl] Error executing curl: ${error.message}`);
      console.error(`[structure_curl] Curl stderr: ${stderr}`);
      return res.status(500).json({
        error: "Failed to execute command to fetch Drupal structure.",
        details: error.message,
        stderrOutput: stderr
      });
    }

    // Even if exec error is null, stderr might contain warnings
    if (stderr) {
      console.warn(`[structure_curl] Curl stderr (non-fatal or warning): ${stderr}`);
    }

    try {
      const structureData = JSON.parse(stdout);
      console.log("[structure_curl] Successfully fetched and parsed data via curl.");
      res.json({ structure: structureData }); // Match the original expected output structure
    } catch (parseError: any) {
      console.error(`[structure_curl] Error parsing JSON response from curl: ${parseError.message}`);
      console.error(`[structure_curl] Curl stdout was (first 500 chars): ${stdout.substring(0, 500)}...`);
      res.status(500).json({
        error: "Failed to parse JSON response from Drupal site via curl.",
        details: parseError.message,
      });
    }
  });
});

export default router;
