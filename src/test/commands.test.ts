import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Command Registration', () => {

  test('resetSystemPrompt command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('aihandler.resetSystemPrompt'),
      'resetSystemPrompt command not registered'
    );
  });

  test('resetSystemPrompt resets configuration value', async () => {
    const config = vscode.workspace.getConfiguration('aihandler');

    await config.update(
      'systemPrompt',
      'CUSTOM PROMPT',
      vscode.ConfigurationTarget.Global
    );

    await vscode.commands.executeCommand(
      'aihandler.resetSystemPrompt'
    );

    const value = config.get<string>('systemPrompt');
    assert.ok(value);
    assert.ok(
      value!.includes('CRITICAL RULES'),
      'System prompt was not reset'
    );
  });

});
