import { AIProvider, ProviderConfig } from '../provider';
import { buildPrompt } from '../prompt';

interface OllamaResponse {
  message: {
    content: string;
  };
}

export class OllamaProvider implements AIProvider {
  name = 'Ollama';

  constructor(private config: ProviderConfig) {}

  async generateCommitMessage(diff: string, signal: AbortSignal): Promise<string> {
    const response = await fetch(`${this.config.apiUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.config.systemPrompt },
          { role: 'user', content: buildPrompt(diff) }
        ],
        stream: false,
        options: {
          temperature: 0.2
        }
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const json = await response.json() as OllamaResponse;
    return this.cleanMessage(json.message.content);
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.config.apiUrl}/api/tags`);

    if (!response.ok) {
      throw new Error('Failed to load models');
    }

    const data = await response.json() as { models: { name: string }[] };
    return data.models.map(m => m.name).sort();
  }

  private cleanMessage(message: string): string {
    return message
      .trim()
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .replace(/^(Here (is|'s) (a|the|your)|This is a) .+?:\s*/i, '')
      .trim();
  }
}