import { Router } from "express";
import type { RequestHandler } from "express";
import { sign } from "jsonwebtoken";

const router = Router();

// This should be moved to environment variables in production
const JWT_SECRET = process.env.JWT_SECRET as string;

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
      JWT_SECRET,
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
