import { useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { ChatMessage } from '../types/chat';
import { v4 as uuidv4 } from 'uuid';

interface NodeEvent {
  content_type: string;
  title: string;
  body: string;
  image?: string;
  link: string;
}

export const useNodeEvents = () => {
  const { addMessage } = useChat();

  useEffect(() => {
    // In a real implementation, this would connect to your WebSocket server
    // For now, we'll use a custom event that can be triggered from anywhere
    const handleNodeCreated = (event: CustomEvent<NodeEvent>) => {
      const nodeData = event.detail;
      
      const message: ChatMessage = {
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
      
      addMessage(message);
    };

    // Add event listener for node-created events
    // @ts-ignore - CustomEvent is not in the WindowEventMap
    window.addEventListener('node-created', handleNodeCreated);

    return () => {
      // @ts-ignore
      window.removeEventListener('node-created', handleNodeCreated);
    };
  }, [addMessage]);

  // Function to manually trigger a node created event (for testing)
  const emitNodeCreated = (nodeData: NodeEvent) => {
    const event = new CustomEvent('node-created', { detail: nodeData });
    window.dispatchEvent(event);
  };

  return { emitNodeCreated };
};
