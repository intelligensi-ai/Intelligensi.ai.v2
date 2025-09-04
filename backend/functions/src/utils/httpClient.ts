import https from "https";
import axios, { AxiosInstance } from "axios";

// Create a custom axios instance that ignores SSL certificate errors in development
const createHttpClient = (baseURL?: string): AxiosInstance => {
  const isDevelopment = process.env.NODE_ENV === "development" || process.env.FUNCTIONS_EMULATOR === "true";

  const instance = axios.create({
    baseURL,
    httpsAgent: new https.Agent({
      rejectUnauthorized: !isDevelopment,
    }),
  });

  return instance;
};

export const httpClient = createHttpClient();
export default createHttpClient;
