import { AIProvider, ProviderConfig } from '../provider';
import { buildPrompt } from '../prompt';

interface AnthropicResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export class AnthropicProvider implements AIProvider {
  name = 'Anthropic';
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(private config: ProviderConfig) { }

  async generateCommitMessage(diff: string, signal: AbortSignal): Promise<string> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 1024,
        system: this.config.systemPrompt,
        messages: [
          { role: 'user', content: buildPrompt(diff) }
        ],
        temperature: 0.2
      }),
      signal
    });

    const data = await response.json() as
      | AnthropicResponse
      | { error?: { message?: string } };

    if (!response.ok) {
      throw new Error(
        `Anthropic error: ${'error' in data && data.error?.message
          ? data.error.message
          : response.statusText || 'Unknown error'
        }`
      );
    }

    return this.cleanMessage(
      (data as AnthropicResponse).content[0].text
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model || 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        })
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
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