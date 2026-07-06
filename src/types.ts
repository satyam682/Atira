export type WorkspaceMode = 'chat' | 'coding' | 'cowork';

export type NavItemId = 'chat' | 'api-keys' | 'usage' | 'integrations' | 'settings' | 'history' | 'admin';

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  tagline: string;
  isSpark: boolean;
}

export interface HistoryItem {
  id: string;
  title: string;
  timestamp: string;
  category: 'chat' | 'coding' | 'cowork';
  preview: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  credits: number;
}
