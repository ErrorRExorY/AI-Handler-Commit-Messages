import * as assert from 'assert';
import { OpenAIProvider } from '../../providers/openai';
import { ProviderConfig } from '../../provider';

function mockFetchOnce(response: {
  ok: boolean;
  json: () => Promise<any>;
  statusText?: string;
}) {
  (globalThis as any).fetch = async () => response;
}


suite('OpenAIProvider', () => {

  teardown(() => {
    delete (globalThis as any).fetch;
  });

  test('generateCommitMessage returns cleaned message', async () => {
    mockFetchOnce({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: 'Here is a commit message: fix: openai' } }
        ]
      })
    });

    const provider = new OpenAIProvider({
      apiKey: 'key',
      model: 'gpt-test',
      systemPrompt: 'sys'
    } as ProviderConfig);

    const result = await provider.generateCommitMessage(
      'diff',
      new AbortController().signal
    );

    assert.strictEqual(result, 'fix: openai');
  });

});
