import * as assert from 'assert';
import * as vscode from 'vscode';
import { OpenWebUIViewProvider } from '../webviewProvider';

suite('Webview Provider', () => {

  test('provider can be instantiated', () => {
    const context = {
      extensionUri: vscode.Uri.file('/tmp'),
      globalState: {
        get: () => undefined,
        update: async () => {}
      }
    } as unknown as vscode.ExtensionContext;

    const provider = new OpenWebUIViewProvider(
      context.extensionUri,
      context
    );

    assert.ok(provider);
  });

  test('cached models are stored and retrievable', async () => {
    let store: any;

    const context = {
      extensionUri: vscode.Uri.file('/tmp'),
      globalState: {
        get: () => store,
        update: async (_: string, value: any) => {
          store = value;
        }
      }
    } as unknown as vscode.ExtensionContext;

    await context.globalState.update(
      'openwebui.cachedModels',
      ['llama3:8b']
    );

    const cached = context.globalState.get('openwebui.cachedModels');
    assert.deepStrictEqual(cached, ['llama3:8b']);
  });
});
