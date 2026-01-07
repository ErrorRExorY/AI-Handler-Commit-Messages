import * as assert from 'assert';
import { GoogleProvider } from '../../providers/google';
import { ProviderConfig } from '../../provider';

function mockFetchOnce(response: {
  ok: boolean;
  json: () => Promise<any>;
  statusText?: string;
}) {
  (globalThis as any).fetch = async () => response;
}


suite('GoogleProvider', () => {

  teardown(() => {
    delete (globalThis as any).fetch;
  });

  test('generateCommitMessage extracts candidate text', async () => {
    mockFetchOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'feat: google test' }]
            }
          }
        ]
      })
    });

    const provider = new GoogleProvider({
      apiKey: 'key',
      model: 'gemini-test',
      systemPrompt: 'sys'
    } as ProviderConfig);

    const result = await provider.generateCommitMessage(
      'diff',
      new AbortController().signal
    );

    assert.strictEqual(result, 'feat: google test');
  });

});
