import { AIProvider, ProviderConfig, ProviderType } from './provider';
import { OpenWebUIProvider } from './providers/openwebui';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleProvider } from './providers/google';
import { OllamaProvider } from './providers/ollama';

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
      
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }

  static getProviderInfo(): Array<{
    id: ProviderType;
    name: string;
    requiresUrl: boolean;
    defaultUrl?: string;
    description: string;
  }> {
    return [
      {
        id: ProviderType.OPENWEBUI,
        name: 'OpenWebUI',
        requiresUrl: true,
        defaultUrl: 'http://localhost:8080',
        description: 'Self-hosted OpenWebUI instance'
      },
      {
        id: ProviderType.OPENAI,
        name: 'OpenAI',
        requiresUrl: false,
        description: 'OpenAI GPT models (GPT-4, GPT-3.5, etc.)'
      },
      {
        id: ProviderType.ANTHROPIC,
        name: 'Anthropic',
        requiresUrl: false,
        description: 'Anthropic Claude models'
      },
      {
        id: ProviderType.GOOGLE,
        name: 'Google AI',
        requiresUrl: false,
        description: 'Google Gemini models'
      },
      {
        id: ProviderType.OLLAMA,
        name: 'Ollama',
        requiresUrl: true,
        defaultUrl: 'http://localhost:11434',
        description: 'Local Ollama instance'
      }
    ];
  }
}