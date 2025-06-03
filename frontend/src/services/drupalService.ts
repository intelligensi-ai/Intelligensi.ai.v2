import { ContentNode } from '../types/drupal';

export const fetchDrupalContent = async (params: { url: string }): Promise<ContentNode[]> => {
  const apiUrl = `/api/drupal/content?url=${encodeURIComponent(params.url)}`;
  
  try {
    console.log('Fetching Drupal content from:', apiUrl);
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Get response content type
    const contentType = response.headers.get('content-type') || '';
    
    // If we got HTML instead of JSON, log it for debugging
    if (contentType.includes('text/html')) {
      const text = await response.text();
      console.error('Received HTML response instead of JSON. First 500 chars:', text.substring(0, 500));
      throw new Error('Server returned HTML instead of JSON. Check the API endpoint.');
    }

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If we can't parse JSON, use the status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      console.warn('Expected array but received:', data);
      return [];
    }
    return data;
  } catch (error) {
    console.error('Error in fetchDrupalContent:', {
      error,
      url: params.url,
      apiUrl,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error(`Failed to fetch Drupal content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export default {
  fetchDrupalContent,
};
