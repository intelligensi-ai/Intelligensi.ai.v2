import axiosOriginal, { AxiosInstance } from "axios";
import * as https from "https";

let axios: AxiosInstance = axiosOriginal;

if (process.env.FUNCTIONS_EMULATOR === "true") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  axios = axiosOriginal.create({ httpsAgent });

  // patch global fetch (node 18+)
  type ExtendedRequestInit = RequestInit & { agent?: https.Agent };
  type GlobalWithFetch = typeof globalThis & {
    fetch?: (input: RequestInfo | URL, init?: ExtendedRequestInit) => Promise<Response>;
  };
  const g = global as GlobalWithFetch;
  const originalFetch = g.fetch;
  if (originalFetch) {
    g.fetch = (input: RequestInfo | URL, init: ExtendedRequestInit = {}) => {
      const options: ExtendedRequestInit = { ...init };
      if (!options.agent) options.agent = httpsAgent;
      return originalFetch(input, options);
    };
  }
}

export default axios;
