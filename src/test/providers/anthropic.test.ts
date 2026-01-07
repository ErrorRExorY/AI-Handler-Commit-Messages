import * as assert from 'assert';
import { AnthropicProvider } from '../../providers/anthropic';
import { ProviderConfig } from '../../provider';

suite('AnthropicProvider', () => {

  teardown(() => {
    delete (globalThis as any).fetch;
  });

  test('listModels returns static model list', async () => {
    const provider = new AnthropicProvider({
      apiKey: 'key',
      model: '',
      systemPrompt: ''
    } as ProviderConfig);

    const models = await provider.listModels();

    assert.ok(models.length > 0);
    assert.ok(models.some(m => m.startsWith('claude-')));
  });

});
