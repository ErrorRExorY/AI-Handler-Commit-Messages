import { AIProvider, ProviderConfig } from '../provider';
import { buildPrompt } from '../prompt';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
interface OpenAIErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

function supportsTemperature(model: string): boolean {
  if (
    model.startsWith('o1') ||
    model.startsWith('o3') ||
    model.endsWith('-nano')
  ) {
    return false;
  }

  return true;
}


export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  private baseUrl = 'https://api.openai.com/v1';

  constructor(private config: ProviderConfig) { }

  async generateCommitMessage(diff: string, signal: AbortSignal): Promise<string> {
    const body: any = {
      model: this.config.model,
      messages: [
        { role: 'system', content: this.config.systemPrompt },
        { role: 'user', content: buildPrompt(diff) }
      ]
    };

    if (supportsTemperature(this.config.model)) {
      body.temperature = 0.2;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(body),
      signal
    });

    const data = await response.json() as OpenAIResponse | OpenAIErrorResponse;

    if (!response.ok) {
      throw new Error(
        `OpenAI error: ${'error' in data && data.error?.message
          ? data.error.message
          : response.statusText
        }`
      );
    }

    return this.cleanMessage(
      (data as OpenAIResponse).choices[0].message.content
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load models');
    }

    const data = await response.json() as { data: { id: string }[] };
    return data.data
      .map(m => m.id)
      .filter(id => id.startsWith('gpt-') || id.startsWith('o1'))
      .sort();
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