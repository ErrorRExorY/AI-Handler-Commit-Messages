import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  generateCommitMessage,
  testConnection,
  listModels
} from '../aihandler';

suite('AI Handler', () => {

  teardown(() => {
    delete (globalThis as any).fetch;
  });

  test('generateCommitMessage throws if no model configured', async () => {
    const config = vscode.workspace.getConfiguration('aihandler');
    await config.update('model', '', vscode.ConfigurationTarget.Global);

    let threw = false;
    try {
      await generateCommitMessage('diff', new AbortController().signal);
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes('No model selected'));
    }

    assert.ok(threw);
  });

  test('testConnection returns boolean', async () => {
    (globalThis as any).fetch = async () => ({ ok: true });

    const result = await testConnection();
    assert.strictEqual(typeof result, 'boolean');
  });

  test('listModels returns array', async () => {
    (globalThis as any).fetch = async () => ({
      ok: true,
      json: async () => ({
        data: [{ id: 'model-a' }, { id: 'model-b' }]
      })
    });

    const models = await listModels();
    assert.ok(Array.isArray(models));
  });

});
