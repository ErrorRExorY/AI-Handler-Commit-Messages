import * as vscode from 'vscode';
import { getGitDiff } from './git';
import { generateCommitMessage } from './aihandler';
import { AIHandlerViewProvider } from './webviewProvider';
import { DEFAULT_SYSTEM_PROMPT } from './defaultSystemPrompt';
import { setExtensionContext } from './aihandler';
import { requestNewPublicApiKey } from './publicKey';

interface RegisterResponse {
  apiKey: string;
}

const PUBLIC_API_KEY_SECRET = 'aihandler.publicApiKey';
let currentAbortController: AbortController | null = null;

export async function activate(context: vscode.ExtensionContext) {
  let publicKey = await context.secrets.get(PUBLIC_API_KEY_SECRET);

  if (!publicKey) {
    const response = await fetch(
      'https://ws.shortn.cloud/public/register',
      { method: 'POST' }
    );

    if (!response.ok) {
      throw new Error('Failed to register public client');
    }

    const json = (await response.json()) as Partial<RegisterResponse>;

    if (!json.apiKey || typeof json.apiKey !== 'string') {
      throw new Error('Invalid response from registration endpoint');
    }
    publicKey = json.apiKey;

    await context.secrets.store(PUBLIC_API_KEY_SECRET, publicKey);
  }
  setExtensionContext(context);

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
  context.subscriptions.push(
  vscode.commands.registerCommand(
    'aihandler.regeneratePublicApiKey',
    async () => {
      const confirm = await vscode.window.showWarningMessage(
        'This will generate a NEW public API key and invalidate the old one.\n\nContinue?',
        { modal: true },
        'Yes'
      );

      if (confirm !== 'Yes') {
        return;
      }

      try {
        const newKey = await requestNewPublicApiKey();

        await context.secrets.store(PUBLIC_API_KEY_SECRET, newKey);

        vscode.window.showInformationMessage(
          'Public API key regenerated successfully.'
        );

      } catch (err: any) {
        vscode.window.showErrorMessage(
          `Failed to regenerate public API key: ${err.message}`
        );
      }
    }
  )
);

  const provider = new AIHandlerViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      AIHandlerViewProvider.viewType,
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
              const config = vscode.workspace.getConfiguration('aihandler');
              const onlyStaged = config.get<boolean>('onlyStagedChanges', true);
              const diff = await getGitDiff(repoPath, onlyStaged);
              if (!diff.trim()) {
                vscode.window.showWarningMessage(
                  'No staged changes found. Stage files first or disable "only staged changes" in settings.'
                );
                return;
              }
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