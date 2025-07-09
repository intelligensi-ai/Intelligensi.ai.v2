import { createClient } from "@supabase/supabase-js";
import { defineSecret } from "firebase-functions/params";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";

// Define secrets with proper typing
const supabaseUrlSecret = defineSecret("SUPABASE_URL");
const supabaseServiceRoleKey = defineSecret("SUPABASE_SERVICE_ROLE_KEY");

interface GetUserDataRequest {
  userId: string;
}

/**
 * Get user data by ID (admin only)
 */
export const getUserData = onCall(
  {
    region: "us-central1",
    secrets: [supabaseServiceRoleKey, supabaseUrlSecret],
    memory: "1GiB",
    timeoutSeconds: 60
  },
  async (request: CallableRequest<GetUserDataRequest>) => {
    // Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    // Create Supabase admin client with secrets
    const supabaseAdmin = createClient(
      supabaseUrlSecret.value(),
      supabaseServiceRoleKey.value(),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    try {
      const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(request.data.userId);

      if (error) {
        console.error("Error getting user data:", error);
        throw new HttpsError("internal", "Failed to fetch user data");
      }

      return {
        success: true,
        data: {
          id: userData.user.id,
          email: userData.user.email,
          // Add other user fields as needed
        },
      };
    } catch (error) {
      console.error("Unexpected error in getUserData:", error);
      throw new HttpsError("internal", "An unexpected error occurred");
    }
  }
);

export default {
  getUserData,
};
