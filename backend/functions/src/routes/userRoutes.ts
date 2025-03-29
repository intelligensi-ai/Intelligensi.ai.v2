import type { Request, Response, NextFunction } from "express";
import { Router } from "express"; // Removed NextFunction from here
import supabase from "../services/supabaseService";
import asyncHandler from "../utils/asyncHandler";

// eslint-disable-next-line new-cap
const router = Router();

// ✅ Fetch user by email with asyncHandler
router.get("/fetchuser", asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.query;

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.status(200).json({ success: true, data });
}));

// ✅ Update or create user with asyncHandler
router.post("/updateuser", asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    uid,
    displayName,
    email,
    companyId,
    profilePicture,
    isActive
  }: {
    uid: string;
    displayName: string;
    email: string;
    companyId?: number;
    profilePicture?: string;
    isActive?: boolean;
  } = req.body;

  if (!uid || !email) {
    res.status(400).json({ error: "UID and Email are required" });
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .upsert([
      {
        uid,
        display_name: displayName,
        email,
        company_id: companyId || null,
        profile_picture: profilePicture || "",
        is_active: isActive ?? true
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("Error upserting user:", error.message);
    res.status(500).json({ error: "Failed to upsert user." });
    return;
  }

  res.status(200).json({ success: true, data });
}));

export default router;
