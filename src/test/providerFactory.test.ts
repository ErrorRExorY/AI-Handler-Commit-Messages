import * as assert from 'assert';
import { ProviderFactory } from '../providerFactory';
import { ProviderType } from '../provider';

suite('ProviderFactory', () => {

  test('throws on unsupported provider type', () => {
    assert.throws(() => {
      ProviderFactory.createProvider(
        'INVALID_PROVIDER' as any,
        {} as any
      );
    });
  });

  test('getProviderInfo returns provider metadata', () => {
    const info = ProviderFactory.getProviderInfo();

    assert.ok(Array.isArray(info));
    assert.ok(info.length > 0);

    const openWebUI = info.find(p => p.id === ProviderType.OPENWEBUI);
    assert.ok(openWebUI);
    assert.ok(openWebUI!.name);
  });

});
