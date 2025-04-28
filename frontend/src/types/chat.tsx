export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  status?: 'error' | 'sending' | 'sent';
  timestamp?: Date;
  type?: 'site' | 'vectorization';
  site?: {
    id: number;
    name: string;
    url: string;
    cms: string;
    cmsIcon?: string;
    description?: string;
  };
  vectorizationResults?: {
    objectsCreated: number;
    siteId: number;
  };
}