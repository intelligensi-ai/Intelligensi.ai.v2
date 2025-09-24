import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '../types/chat';

/**
 * Creates a node creation notification message
 */
export const createNodeNotification = (nodeData: {
  content_type: string;
  title: string;
  body: string;
  image?: string;
  link: string;
}): ChatMessage => {
  return {
    id: `node-${uuidv4()}`,
    text: `Created ${nodeData.content_type}: ${nodeData.title}`,
    sender: 'assistant',
    type: 'node',
    node: {
      content_type: nodeData.content_type,
      title: nodeData.title,
      body: nodeData.body,
      image: nodeData.image,
      link: nodeData.link
    },
    timestamp: new Date()
  };
};

/**
 * Checks if a message is a node creation notification
 */
export const isNodeNotification = (message: ChatMessage): boolean => {
  return message.type === 'node' && !!message.node;
};
