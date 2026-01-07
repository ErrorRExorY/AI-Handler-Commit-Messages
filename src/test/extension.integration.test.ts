import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration', () => {

  test('extension activates successfully', async () => {
    const extension = vscode.extensions.getExtension(
      'CptExorY.ai-handler-commit-messages'
    );

    assert.ok(extension, 'Extension not found');
    await extension!.activate();
    assert.ok(extension!.isActive, 'Extension not active');
  });

});
