import * as functions from 'firebase-functions';
import { CallableRequest } from 'firebase-functions/v2/https';

/**
 * Scans a website and returns basic theme information
 */
export const scanWebsiteTheme = functions.https.onCall(
  async (request: CallableRequest<{ url: string }>) => {
    const { data, auth } = request;
    
    if (!data?.url) {
      throw new functions.https.HttpsError('invalid-argument', 'URL is required');
    }
    
    if (!auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    // Return mock theme data for now
    return {
      success: true,
      url: data.url,
      theme: {
        primaryColor: '#4F46E5',
        backgroundColor: '#111827',
        textColor: '#F9FAFB',
        fontFamily: 'Inter, sans-serif'
      }
    };
  }
);

// Export functions
export const themeCraftFunctions = { scanWebsiteTheme };
