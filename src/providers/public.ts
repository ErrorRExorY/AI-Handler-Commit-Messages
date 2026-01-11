import { AIProvider, ProviderConfig } from '../provider';
import { buildPrompt } from '../prompt';

interface LiteLLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class OpenWebUIHostedProvider implements AIProvider {
  name = 'LiteLLM (Public)';
  private baseUrl = 'https://llm.shortn.cloud/v1';

  constructor(private config: ProviderConfig) {}

  async generateCommitMessage(
    diff: string,
    signal: AbortSignal
  ): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-litellm-api-key': this.config.apiKey,
          ...(this.config.apiKey
            ? { Authorization: `Bearer ${this.config.apiKey}` }
            : {})
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: this.config.systemPrompt },
            { role: 'user', content: buildPrompt(diff) }
          ],
          temperature: 0.2
        }),
        signal
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LiteLLM error: ${text}`);
    }

    const json = (await response.json()) as LiteLLMResponse;
    return this.cleanMessage(json.choices[0].message.content);
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/models`,
        {
          method: 'GET',
          headers: {
            ...(this.config.apiKey
              ? { Authorization: `Bearer ${this.config.apiKey}` }
              : {})
          }
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(
      `${this.baseUrl}/models`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-litellm-api-key': this.config.apiKey,
          ...(this.config.apiKey
            ? { Authorization: `Bearer ${this.config.apiKey}` }
            : {})
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to load models: ${text}`);
    }

    const data = await response.json() as {
      data?: { id: string }[];
    };

    return data.data?.map(m => m.id) ?? [];
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
