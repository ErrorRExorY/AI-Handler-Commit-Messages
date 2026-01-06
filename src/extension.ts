import * as vscode from 'vscode';
import { getGitDiff } from './git';
import { generateCommitMessage } from './aihandler';
import { OpenWebUIViewProvider } from './webviewProvider';
import { DEFAULT_SYSTEM_PROMPT } from './defaultSystemPrompt';

let currentAbortController: AbortController | null = null;

export function activate(context: vscode.ExtensionContext) {
  vscode.commands.executeCommand('setContext', 'aihandler.isGenerating', false);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'aihandler.resetSystemPrompt',
      async () => {
        const config = vscode.workspace.getConfiguration('aihandler');

        await config.update(
          'systemPrompt',
          DEFAULT_SYSTEM_PROMPT,
          vscode.ConfigurationTarget.Global
        );

        vscode.window.showInformationMessage(
          'Commit prompt has been reset to default.'
        );
      }
    )
  );

  // Register the webview provider
  const provider = new OpenWebUIViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      OpenWebUIViewProvider.viewType,
      provider
    )
  );

  const generateDisposable = vscode.commands.registerCommand(
    'aihandler.generateCommitMessage',
    async () => {
      try {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        const git = gitExtension.getAPI(1);
        const repo = git.repositories[0];

        if (!repo) {
          vscode.window.showErrorMessage('No git repository found');
          return;
        }

        const repoPath = repo.rootUri.fsPath;

        currentAbortController = new AbortController();
        vscode.commands.executeCommand('setContext', 'aihandler.isGenerating', true);

        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.SourceControl, title: 'Generating commit message...' },
          async () => {
            try {
              const diff = await getGitDiff(repoPath);
              const message = await generateCommitMessage(diff, currentAbortController!.signal);
              repo.inputBox.value = message;
            } catch (err: any) {
              if (err.name === 'AbortError') {
                vscode.window.showInformationMessage('Generation cancelled');
              } else {
                throw err;
              }
            }
          }
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
      } finally {
        vscode.commands.executeCommand('setContext', 'aihandler.isGenerating', false);
        currentAbortController = null;
      }
    }
  );

  const stopDisposable = vscode.commands.registerCommand(
    'aihandler.stopGeneration',
    () => {
      if (currentAbortController) {
        currentAbortController.abort();
      }
    }
  );

  context.subscriptions.push(generateDisposable, stopDisposable);
}

export function registerResetPromptCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'aihandler.resetSystemPrompt',
      async () => {
        const config = vscode.workspace.getConfiguration('aihandler');

        await config.update(
          'systemPrompt',
          DEFAULT_SYSTEM_PROMPT,
          vscode.ConfigurationTarget.Global
        );

        vscode.window.showInformationMessage(
          'OpenWebUI commit prompt has been reset to default.'
        );
      }
    )
  );
}