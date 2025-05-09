import { onCall } from "firebase-functions/v2/https";
import { LightsailClient, CreateInstancesCommand, GetKeyPairCommand } from "@aws-sdk/client-lightsail";
import { defineString } from "firebase-functions/params";

// Configuration parameters
const awsRegion = defineString("AWS_REGION", { default: "eu-west-2" });
const awsKeyPair = defineString("AWS_KEY_PAIR", { default: "Intelligensi.ai" });
const instancePrefix = defineString("INSTANCE_PREFIX", { default: "drupal" });

interface CreateDrupalSiteData {
  customName?: string;
}

export const createDrupalSite = onCall<CreateDrupalSiteData>({
  cors: ["*"],
}, async (request) => {
  // For development environment or emulator, return mock data
  if (process.env.NODE_ENV === "development" || process.env.FUNCTIONS_EMULATOR === "true") {
    console.log("Development/Emulator environment detected, returning mock data");
    return {
      success: true,
      operation: {
        id: "mock-operation-id",
        status: "Completed",
        type: "CreateInstance",
      },
      customName: request.data.customName || "default-site-name",
    };
  }

  // Ensure AWS credentials are present
  if (!process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY) {
    throw new Error("AWS credentials are required");
  }

  const region = awsRegion.value();
  const keyPairName = awsKeyPair.value();

  const lightsailClient = new LightsailClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    },
  });

  // Verify the key pair exists
  try {
    await lightsailClient.send(new GetKeyPairCommand({ keyPairName }));
  } catch (err) {
    console.error("Error verifying key pair:", err);
    throw new Error(`AWS key pair '${keyPairName}' not found. Please create it first.`);
  }

  // Generate a unique instance name
  const timestamp = Date.now();
  const customName = request.data?.customName?.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const instanceName = customName ?
    `${instancePrefix.value()}-${customName}-${timestamp}` :
    `${instancePrefix.value()}-${timestamp}`;

  // Validate instance name length (Lightsail has a limit)
  if (instanceName.length > 63) {
    throw new Error("Instance name is too long. Please use a shorter custom name.");
  }

  const blueprintId = "drupal";
  const bundleId = "nano_2_0"; // Cheapest plan

  try {
    const command = new CreateInstancesCommand({
      instanceNames: [instanceName],
      availabilityZone: `${region}a`, // Using first AZ in the region
      blueprintId,
      bundleId,
      keyPairName,
    });

    const res = await lightsailClient.send(command);
    console.log("Lightsail response:", JSON.stringify(res, null, 2));

    if (res.operations && res.operations.length > 0) {
      return { success: true, operation: res.operations[0] };
    } else {
      console.warn("No operations data returned:", res);
      return { success: false, message: "Instance created but no operation data." };
    }
  } catch (err) {
    console.error("Error:", err);
    console.error("Error creating Drupal instance:", err);
    if (err instanceof Error) {
      // Check for specific AWS errors
      if (err.message.includes("AccessDenied")) {
        throw new Error("AWS access denied. Please check credentials and permissions.");
      } else if (err.message.includes("InvalidInput")) {
        throw new Error("Invalid input parameters for AWS Lightsail.");
      } else if (err.message.includes("NotFoundException")) {
        throw new Error("AWS resource not found. Please check configuration.");
      }
      throw new Error(`AWS Error: ${err.message}`);
    }
    throw new Error("Unknown error creating Drupal instance");
  }
});
