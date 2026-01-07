import * as vscode from 'vscode';
import { ProviderFactory } from './providerFactory';
import { ProviderType, ProviderConfig } from './provider';
import { DEFAULT_SYSTEM_PROMPT } from './defaultSystemPrompt';

export async function generateCommitMessage(
  diff: string,
  signal: AbortSignal
): Promise<string> {
  const config = vscode.workspace.getConfiguration('aihandler');

  const providerType = config.get<ProviderType>('provider') || ProviderType.OPENWEBUI;
  const apiUrl = config.get<string>('apiUrl');
  const apiKey = config.get<string>('apiKey') || '';
  const model = config.get<string>('model') || '';
  const systemPrompt = config.get<string>('systemPrompt')?.trim() || DEFAULT_SYSTEM_PROMPT;

  if (!model) {
    throw new Error('No model selected. Please configure a model in settings.');
  }

  const providerConfig: ProviderConfig = {
    apiUrl,
    apiKey,
    model,
    systemPrompt
  };

  const provider = ProviderFactory.createProvider(providerType, providerConfig);
  
  try {
    return await provider.generateCommitMessage(diff, signal);
  } catch (error: any) {
    throw new Error(`${provider.name} error: ${error.message}`);
  }
}

export async function testConnection(): Promise<boolean> {
  const config = vscode.workspace.getConfiguration('aihandler');

  const providerType = config.get<ProviderType>('provider') || ProviderType.OPENWEBUI;
  const apiUrl = config.get<string>('apiUrl');
  const apiKey = config.get<string>('apiKey') || '';
  const model = config.get<string>('model') || '';
  const systemPrompt = config.get<string>('systemPrompt')?.trim() || DEFAULT_SYSTEM_PROMPT;

  const providerConfig: ProviderConfig = {
    apiUrl,
    apiKey,
    model,
    systemPrompt
  };

  const provider = ProviderFactory.createProvider(providerType, providerConfig);
  return await provider.testConnection();
}

export async function listModels(): Promise<string[]> {
  const config = vscode.workspace.getConfiguration('aihandler');

  const providerType = config.get<ProviderType>('provider') || ProviderType.OPENWEBUI;
  const apiUrl = config.get<string>('apiUrl');
  const apiKey = config.get<string>('apiKey') || '';
  const model = config.get<string>('model') || '';
  const systemPrompt = config.get<string>('systemPrompt')?.trim() || DEFAULT_SYSTEM_PROMPT;

  const providerConfig: ProviderConfig = {
    apiUrl,
    apiKey,
    model,
    systemPrompt
  };

  const provider = ProviderFactory.createProvider(providerType, providerConfig);
  
  if (provider.listModels) {
    return await provider.listModels();
  }
  
  return [];
}