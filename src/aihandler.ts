import * as vscode from 'vscode';
import { ProviderFactory } from './providerFactory';
import { ProviderType, ProviderConfig } from './provider';
import { DEFAULT_SYSTEM_PROMPT } from './defaultSystemPrompt';

let extensionContext: vscode.ExtensionContext | undefined;

export function setExtensionContext(ctx: vscode.ExtensionContext) {
  extensionContext = ctx;
}


export async function generateCommitMessage(
  diff: string,
  signal: AbortSignal
): Promise<string> {
  const config = vscode.workspace.getConfiguration('aihandler');

  const providerType = config.get<ProviderType>('provider') || ProviderType.OPENWEBUI;
  let apiUrl = config.get<string>('apiUrl');
  let apiKey = config.get<string>('apiKey') || '';
  const model = config.get<string>('model') || '';
  const systemPrompt = config.get<string>('systemPrompt')?.trim() || DEFAULT_SYSTEM_PROMPT;

  if (!model) {
    throw new Error('No model selected. Please configure a model in settings.');
  }

  if (providerType === ProviderType.PUBLIC) {
    if (!extensionContext) {
      throw new Error('Extension context not initialized');
    }

    apiKey =
      (await extensionContext.secrets.get('aihandler.publicApiKey')) ?? '';

    apiUrl = undefined;
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
  let apiUrl = config.get<string>('apiUrl');
  let apiKey = '';
  const model = config.get<string>('model') || '';
  const systemPrompt = config.get<string>('systemPrompt')?.trim() || DEFAULT_SYSTEM_PROMPT;
  if (providerType === ProviderType.PUBLIC) {
    if (!extensionContext) {
      throw new Error('Extension context not initialized');
    }

    apiKey =
      (await extensionContext.secrets.get('aihandler.publicApiKey')) ?? '';

    if (!apiKey) {
      throw new Error('Public API key missing. Please re-register.');
    }

    apiUrl = undefined; // public provider controls its own baseUrl
  } else {
    apiKey = config.get<string>('apiKey') || '';
  }

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
  let apiUrl = config.get<string>('apiUrl');
  let apiKey = config.get<string>('apiKey') || '';
  const model = config.get<string>('model') || '';
  const systemPrompt = config.get<string>('systemPrompt')?.trim() || DEFAULT_SYSTEM_PROMPT;

  if (providerType === ProviderType.PUBLIC) {
    if (!extensionContext) {
      throw new Error('Extension context not initialized');
    }

    apiKey =
      (await extensionContext.secrets.get('aihandler.publicApiKey')) ?? '';

    apiUrl = undefined;
  }

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