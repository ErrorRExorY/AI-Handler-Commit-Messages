import { AIProvider, ProviderConfig, ProviderType } from './provider';
import { OpenWebUIProvider } from './providers/openwebui';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleProvider } from './providers/google';
import { OllamaProvider } from './providers/ollama';
import { OpenWebUIHostedProvider } from './providers/public';

export class ProviderFactory {
  static createProvider(type: ProviderType, config: ProviderConfig): AIProvider {
    switch (type) {
      case ProviderType.OPENWEBUI:
        return new OpenWebUIProvider(config);
      
      case ProviderType.OPENAI:
        return new OpenAIProvider(config);
      
      case ProviderType.ANTHROPIC:
        return new AnthropicProvider(config);
      
      case ProviderType.GOOGLE:
        return new GoogleProvider(config);
      
      case ProviderType.OLLAMA:
        return new OllamaProvider(config);

      case ProviderType.PUBLIC:
        return new OpenWebUIHostedProvider(config);

      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }

  static getProviderInfo(): Array<{
    id: ProviderType;
    name: string;
    requiresUrl: boolean;
    requiresApiKey: boolean;
    defaultUrl?: string;
    description: string;
  }> {
    return [
      {
        id: ProviderType.OPENWEBUI,
        name: 'OpenWebUI',
        requiresUrl: true,
        requiresApiKey: true,
        defaultUrl: 'http://localhost:8080',
        description: 'Self-hosted OpenWebUI instance'
      },
      {
        id: ProviderType.OPENAI,
        name: 'OpenAI',
        requiresUrl: false,
        requiresApiKey: true,
        description: 'OpenAI GPT models (GPT-4, GPT-3.5, etc.)'
      },
      {
        id: ProviderType.ANTHROPIC,
        name: 'Anthropic',
        requiresUrl: false,
        requiresApiKey: true,
        description: 'Anthropic Claude models'
      },
      {
        id: ProviderType.GOOGLE,
        name: 'Google AI',
        requiresUrl: false,
        requiresApiKey: true,
        description: 'Google Gemini models'
      },
      {
        id: ProviderType.OLLAMA,
        name: 'Ollama',
        requiresUrl: true,
        requiresApiKey: true,
        defaultUrl: 'http://localhost:11434',
        description: 'Local Ollama instance'
      },
      {
        id: ProviderType.PUBLIC,
        name: 'Public',
        requiresUrl: false,
        requiresApiKey: false,
        description: 'Free OpenWebUI instance. (slow but free)'
      }
    ];
  }
}