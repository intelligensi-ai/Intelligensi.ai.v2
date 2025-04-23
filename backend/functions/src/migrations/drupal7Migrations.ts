import express from "express";
import axios from "axios";
import https from "https";

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
 * @param req - Express request object with query params: endpoint, username, password
 * @param res - Express response object
 */
router.get("/structure", async function(req: express.Request, res: express.Response) {
  const { endpoint, username, password } = req.query;
  const structureEndpoint = `${endpoint}/drupal7-structure`;

  try {
    const structureResponse = await axios.get(structureEndpoint, {
      auth: { username: username as string, password: password as string },
      httpsAgent, // Use the HTTPS agent
    });

    res.json({
      structure: structureResponse.data,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching site structure:", error.message);
    } else {
      console.error("Error fetching site structure:", error);
    }
    res.status(500).json({ error: "Failed to fetch site structure" });
  }
});

export default router;
