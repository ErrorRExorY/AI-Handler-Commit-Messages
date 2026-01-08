/**
 * Base interface for all AI providers
 */
export interface AIProvider {
  name: string;
  generateCommitMessage(diff: string, signal: AbortSignal): Promise<string>;
  testConnection(): Promise<boolean>;
  listModels?(): Promise<string[]>;
}

export interface ProviderConfig {
  apiUrl?: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
}

export enum ProviderType {
  OPENWEBUI = 'openwebui',
  PUBLIC = 'public',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  OLLAMA = 'ollama',
  AZURE_OPENAI = 'azure-openai',
  COHERE = 'cohere',
  MISTRAL = 'mistral'
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}