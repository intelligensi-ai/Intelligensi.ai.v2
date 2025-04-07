export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  status?: 'error' | 'sending' | 'sent';
  timestamp?: Date;
  site?: {
    id: number;
    name: string;
    url: string;
    cms: string;
    cmsIcon?: string;  // Add this line
    description?: string;
  };
}