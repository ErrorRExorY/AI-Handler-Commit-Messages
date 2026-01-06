import * as vscode from 'vscode';
import { buildPrompt } from './prompt';
import { DEFAULT_SYSTEM_PROMPT } from './defaultSystemPrompt';

interface OpenWebUIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function generateCommitMessage(
  diff: string,
  signal: AbortSignal
): Promise<string> {
  const config = vscode.workspace.getConfiguration('openwebui');

  const apiUrl = config.get<string>('apiUrl')!;
  const apiKey = config.get<string>('apiKey')!;
  const model = config.get<string>('model')!;

  const systemPrompt =
    config.get<string>('systemPrompt')?.trim() ||
    DEFAULT_SYSTEM_PROMPT;

  const response = await fetch(`${apiUrl}/api/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildPrompt(diff) }
      ],
      temperature: 0.2
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`OpenWebUI error: ${response.statusText}`);
  }

  const json = await response.json() as OpenWebUIResponse;
  let message = json.choices[0].message.content.trim();
  
  message = message
    .replace(/^```[\w]*\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .replace(/^(Here (is|'s) (a|the|your)|This is a) .+?:\s*/i, '');
  
  return message.trim();
}