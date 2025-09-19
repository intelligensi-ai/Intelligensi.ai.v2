import axios, { AxiosInstance } from "axios";
import * as https from "https";

/** Determine if running in Firebase emulator. */
export const isEmulator = (): boolean => {
  // Firebase sets FUNCTIONS_EMULATOR=true when using emulators
  return process.env.FUNCTIONS_EMULATOR === "true";
};

/**
 * Create a pre-configured axios instance.
 * - Adds https agent that ignores self-signed certs in emulator
 * - Sets JSON defaults
 */
export const createAxios = (baseURL?: string): AxiosInstance => {
  const agent = isEmulator()
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

  return axios.create({
    baseURL,
    httpsAgent: agent,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
};

/** Shared default axios client without baseURL. */
export const axiosClient = createAxios();
