import * as assert from 'assert';
import { OpenWebUIProvider } from '../../providers/openwebui';
import { ProviderConfig } from '../../provider';

function mockFetchOnce(response: {
  ok: boolean;
  json: () => Promise<any>;
  statusText?: string;
}) {
  (globalThis as any).fetch = async () => response;
}


suite('OpenWebUIProvider', () => {

  teardown(() => {
    delete (globalThis as any).fetch;
  });

  test('generateCommitMessage returns cleaned message', async () => {
    mockFetchOnce({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: '```commit\nfeat: test\n```' } }
        ]
      })
    });

    const provider = new OpenWebUIProvider({
      apiUrl: 'http://localhost',
      apiKey: '',
      model: 'test',
      systemPrompt: 'sys'
    } as ProviderConfig);

    const result = await provider.generateCommitMessage(
      'diff',
      new AbortController().signal
    );

    assert.strictEqual(result, 'feat: test');
  });

});
