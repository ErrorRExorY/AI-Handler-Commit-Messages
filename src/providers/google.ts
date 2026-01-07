import { AIProvider, ProviderConfig } from '../provider';
import { buildPrompt } from '../prompt';

interface GoogleResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

function extractGeminiText(data: any): string {
  const candidate = data?.candidates?.[0];
  if (!candidate) {
    throw new Error('Google AI returned no candidates');
  }

  const content = candidate.content;

  const partText = content?.parts?.find((p: any) => typeof p.text === 'string')?.text;
  if (partText) {
    return partText;
  }

  if (typeof content?.text === 'string') {
    return content.text;
  }

  throw new Error('Google AI returned no textual content');
}

export class GoogleProvider implements AIProvider {
  name = 'Google AI';
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(private config: ProviderConfig) { }

  async generateCommitMessage(diff: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(
    `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: this.config.systemPrompt }]
        },
        contents: [
          { parts: [{ text: buildPrompt(diff) }] }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      }),
      signal
    }
  );

  const data = await response.json() as
      | GoogleResponse
      | { error?: { message?: string } };

  if (!response.ok) {
      throw new Error(
        `Google error: ${'error' in data && data.error?.message
          ? data.error.message
          : response.statusText || 'Unknown error'
        }`
      );
    }

  const text = extractGeminiText(data);
  return this.cleanMessage(text);
}

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/models?key=${this.config.apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(
      `${this.baseUrl}/models?key=${this.config.apiKey}`
    );

    if (!response.ok) {
      throw new Error('Failed to load models');
    }

    const data = await response.json() as { models: { name: string }[] };
    return data.models
      .map(m => m.name.replace('models/', ''))
      .filter(name => name.startsWith('gemini'))
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