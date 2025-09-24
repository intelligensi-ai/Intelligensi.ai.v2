export interface NodeCardContent {
  content_type: 'recipe' | 'page' | 'article' | string;
  title: string;
  body: string;
  image?: string;
  link: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  status?: 'error' | 'sending' | 'sent';
  timestamp?: Date;
  type?: 'site' | 'vectorization' | 'node';
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
  node?: NodeCardContent;
}