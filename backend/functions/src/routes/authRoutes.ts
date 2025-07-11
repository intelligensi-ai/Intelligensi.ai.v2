import { Router } from "express";
import type { RequestHandler } from "express";
import { sign } from "jsonwebtoken";
import { defineSecret } from "firebase-functions/params";

const router = Router();

// Get JWT secret from Firebase Secrets
const jwtSecret = defineSecret("JWT_SECRET");

// Generate token route
const generateToken: RequestHandler = async (req, res) => {
  try {
    // In a real application, you would validate user credentials here
    // For now, we'll just generate a token
    const token = sign(
      {
        userId: "demo-user",
        timestamp: Date.now(),
      },
      jwtSecret.value(),
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
};

router.get("/token", generateToken);

export default router;
