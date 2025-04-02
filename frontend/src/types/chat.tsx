// src/types/chat.ts
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'Intelligensi';
  timestamp: Date;
  status?: 'sending' | 'delivered' | 'error'; // Make it optional with ?
}