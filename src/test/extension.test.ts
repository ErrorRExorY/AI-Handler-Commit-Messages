import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration', () => {

  test('extension activates successfully', async () => {
    const extension = vscode.extensions.getExtension(
      'CptExorY.openwebui-commits'
    );

    assert.ok(extension, 'Extension not found');
    await extension!.activate();
    assert.ok(extension!.isActive, 'Extension not active');
  });

  test('resetSystemPrompt command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('openwebui.resetSystemPrompt'),
      'resetSystemPrompt command not registered'
    );
  });

  test('resetSystemPrompt resets config value', async () => {
    const config = vscode.workspace.getConfiguration('openwebui');

    await config.update(
      'systemPrompt',
      'CUSTOM PROMPT',
      vscode.ConfigurationTarget.Global
    );

    await vscode.commands.executeCommand(
      'openwebui.resetSystemPrompt'
    );

    const value = config.get<string>('systemPrompt');
    assert.ok(value);
    assert.ok(value!.includes('CRITICAL RULES'));
  });
});
