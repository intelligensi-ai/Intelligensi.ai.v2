/**
 * Dispatches a node created event that can be listened to by the chat
 * @param nodeData The node data to include in the event
 */
export const dispatchNodeCreated = (nodeData: {
  content_type: string;
  title: string;
  body: string;
  image?: string;
  link: string;
}) => {
  const event = new CustomEvent('node-created', {
    detail: {
      type: 'node-created',
      payload: nodeData
    }
  });
  
  window.dispatchEvent(event);
};

/**
 * Helper function to create a node from Drupal API response
 */
export const createNodeFromDrupal = (node: any, baseUrl: string) => {
  return {
    content_type: node.type || 'content',
    title: node.title?.[0]?.value || 'Untitled',
    body: node.body?.[0]?.value || '',
    image: node.field_image?.[0]?.url ? `${baseUrl}${node.field_image[0].url}` : undefined,
    link: `${baseUrl}/node/${node.nid?.[0]?.value || ''}`
  };
};
