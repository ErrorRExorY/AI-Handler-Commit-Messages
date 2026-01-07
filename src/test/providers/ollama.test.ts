import * as assert from 'assert';
import { OllamaProvider } from '../../providers/ollama';
import { ProviderConfig } from '../../provider';

function mockFetchOnce(response: {
  ok: boolean;
  json: () => Promise<any>;
  statusText?: string;
}) {
  (globalThis as any).fetch = async () => response;
}


suite('OllamaProvider', () => {

  teardown(() => {
    delete (globalThis as any).fetch;
  });

  test('listModels returns sorted model list', async () => {
    mockFetchOnce({
      ok: true,
      json: async () => ({
        models: [
          { name: 'llama3' },
          { name: 'mistral' }
        ]
      })
    });

    const provider = new OllamaProvider({
      apiUrl: 'http://localhost',
      model: '',
      apiKey: '',
      systemPrompt: ''
    } as ProviderConfig);

    const models = await provider.listModels();
    assert.deepStrictEqual(models, ['llama3', 'mistral']);
  });

});
