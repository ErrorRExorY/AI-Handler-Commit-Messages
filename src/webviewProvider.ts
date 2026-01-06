import * as vscode from 'vscode';

interface ModelsResponse {
  data?: { id: string }[];
}

export class OpenWebUIViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aihandler.settingsView';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri, private readonly _context: vscode.ExtensionContext) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'getConfig':
          this._sendConfig();
          const cachedModels = this._context.globalState.get<string[]>(
            'aihandler.cachedModels'
          );

          if (cachedModels?.length) {
            webviewView.webview.postMessage({
              type: 'models',
              data: cachedModels
            });
          }
          break;
        case 'updateConfig':
          await this._updateConfig(data.key, data.value);
          break;
        case 'loadModels':
          await this._loadModels();
          break;
        case 'testConnection':
          await this._testConnection();
          break;
        case 'resetSystemPrompt':
          await vscode.commands.executeCommand(
            'aihandler.resetSystemPrompt'
          );

          // danach Config erneut senden, damit UI aktualisiert wird
          this._sendConfig();
          break;
      }
    });

    // Send initial config
    this._sendConfig();
  }

  private async _sendConfig() {
    if (!this._view) {
      return;
    }

    const config = vscode.workspace.getConfiguration('aihandler');
    this._view.webview.postMessage({
      type: 'config',
      data: {
        apiUrl: config.get<string>('apiUrl', ''),
        apiKey: config.get<string>('apiKey', ''),
        model: config.get<string>('model', ''),
        systemPrompt: config.get<string>('systemPrompt', 'You analyze git diffs and write commit messages.')
      }
    });
  }

  private async _updateConfig(key: string, value: string) {
    const config = vscode.workspace.getConfiguration('aihandler');
    await config.update(key, value, vscode.ConfigurationTarget.Global);

    if (key === 'apiUrl' || key === 'apiKey') {
      await this._context.globalState.update(
        'aihandler.cachedModels',
        undefined
      );
    }

    vscode.window.showInformationMessage(`${key} updated successfully`);
  }

  private async _loadModels() {
    if (!this._view) {
      return;
    }

    try {
      const config = vscode.workspace.getConfiguration('aihandler');
      const apiUrl = config.get<string>('apiUrl', '');
      const apiKey = config.get<string>('apiKey', '');

      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      const response = await fetch(`${apiUrl}/api/models`, {
        headers: {
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load models: ${response.statusText}`);
      }

      const data = (await response.json()) as ModelsResponse;
      const models = data.data?.map(m => m.id) ?? [];

      await this._context.globalState.update(
        'aihandler.cachedModels',
        models
      );
      this._view.webview.postMessage({
        type: 'models',
        data: models
      });
    } catch (error: any) {
      this._view.webview.postMessage({
        type: 'error',
        message: error.message
      });
    }
  }

  private async _testConnection() {
    if (!this._view) {
      return;
    }
    
    try {
      const config = vscode.workspace.getConfiguration('aihandler');
      const apiUrl = config.get<string>('apiUrl', '');
      const apiKey = config.get<string>('apiKey', '');

      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      const response = await fetch(`${apiUrl}/api/models`, {
        headers: {
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.statusText}`);
      }

      this._view.webview.postMessage({
        type: 'connectionSuccess',
        message: 'Connection successful!'
      });
    } catch (error: any) {
      this._view.webview.postMessage({
        type: 'error',
        message: error.message
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenWebUI Settings</title>
  <style>
    body {
      padding: 10px;
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    .section {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    input, select, textarea {
      width: 100%;
      padding: 6px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      box-sizing: border-box;
      margin-bottom: 10px;
    }
    textarea {
      min-height: 100px;
      font-family: var(--vscode-editor-font-family);
      resize: vertical;
    }
    button {
      padding: 6px 14px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      cursor: pointer;
      margin-right: 5px;
      margin-bottom: 5px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .message {
      padding: 8px;
      margin: 10px 0;
      border-radius: 3px;
    }
    .success {
      background: var(--vscode-inputValidation-infoBackground);
      border: 1px solid var(--vscode-inputValidation-infoBorder);
    }
    .error {
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
    }
    .info {
      font-size: 0.9em;
      color: var(--vscode-descriptionForeground);
      margin-top: -5px;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <h2>OpenWebUI Settings</h2>
  
  <div class="section">
    <label for="apiUrl">API URL</label>
    <input type="text" id="apiUrl" placeholder="http://localhost:8080">
    <div class="info">The URL of your OpenWebUI instance</div>
  </div>

  <div class="section">
    <label for="apiKey">API Key (optional)</label>
    <input type="password" id="apiKey" placeholder="Enter API key">
    <div class="info">Leave empty if no authentication is required</div>
  </div>

  <div class="section">
    <button id="testConnection" class="secondary">Test Connection</button>
    <button id="loadModels">Load Models</button>
  </div>

  <div class="section">
    <label for="model">Model</label>
    <select id="model">
      <option value="">Select a model...</option>
    </select>
    <div class="info">Click "Load Models" to fetch available models</div>
  </div>

  <div class="section">
    <label for="systemPrompt">System Prompt</label>
    <textarea id="systemPrompt" placeholder="Enter system prompt..."></textarea>
    <div class="info">Instructions for the AI when generating commit messages</div>
    <button id="resetSystemPrompt" class="secondary">
      Reset to Default
    </button>
  </div>

  <div class="section">
    <button id="saveAll">Save All Settings</button>
  </div>

  <div id="messageContainer"></div>

  <script>
    const vscode = acquireVsCodeApi();
    let currentConfig = {};

    // Request initial config
    vscode.postMessage({ type: 'getConfig' });

    // Listen for messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.type) {
        case 'config':
          currentConfig = message.data;
          document.getElementById('apiUrl').value = message.data.apiUrl || '';
          document.getElementById('apiKey').value = message.data.apiKey || '';
          document.getElementById('model').value = message.data.model || '';
          document.getElementById('systemPrompt').value = message.data.systemPrompt || '';
          break;
        
        case 'models':
          const modelSelect = document.getElementById('model');
          const savedModel = currentConfig.model;
          modelSelect.innerHTML = '<option value="">Select a model...</option>';
          message.data.forEach(model => {
          const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
          });

          if (savedModel && message.data.includes(savedModel)) {
            modelSelect.value = savedModel;
          }
          showMessage('Models loaded successfully!', 'success');
          break;
        
        case 'connectionSuccess':
          showMessage(message.message, 'success');
          break;
        
        case 'error':
          showMessage(message.message, 'error');
          break;
      }
    });

    // Save individual settings
    document.getElementById('apiUrl').addEventListener('change', (e) => {
      vscode.postMessage({ type: 'updateConfig', key: 'apiUrl', value: e.target.value });
    });

    document.getElementById('apiKey').addEventListener('change', (e) => {
      vscode.postMessage({ type: 'updateConfig', key: 'apiKey', value: e.target.value });
    });

    document.getElementById('model').addEventListener('change', (e) => {
      vscode.postMessage({ type: 'updateConfig', key: 'model', value: e.target.value });
    });

    document.getElementById('systemPrompt').addEventListener('change', (e) => {
      vscode.postMessage({ type: 'updateConfig', key: 'systemPrompt', value: e.target.value });
    });

    // Button handlers
    document.getElementById('loadModels').addEventListener('click', () => {
      vscode.postMessage({ type: 'loadModels' });
    });

    document.getElementById('testConnection').addEventListener('click', () => {
      vscode.postMessage({ type: 'testConnection' });
    });

    document.getElementById('saveAll').addEventListener('click', () => {
      const apiUrl = document.getElementById('apiUrl').value;
      const apiKey = document.getElementById('apiKey').value;
      const model = document.getElementById('model').value;
      const systemPrompt = document.getElementById('systemPrompt').value;

      vscode.postMessage({ type: 'updateConfig', key: 'apiUrl', value: apiUrl });
      vscode.postMessage({ type: 'updateConfig', key: 'apiKey', value: apiKey });
      vscode.postMessage({ type: 'updateConfig', key: 'model', value: model });
      vscode.postMessage({ type: 'updateConfig', key: 'systemPrompt', value: systemPrompt });
      
      showMessage('All settings saved!', 'success');
    });

    document.getElementById('resetSystemPrompt').addEventListener('click', () => {
      vscode.postMessage({ type: 'resetSystemPrompt' });
    });
    
    function showMessage(text, type) {
      const container = document.getElementById('messageContainer');
      const div = document.createElement('div');
      div.className = 'message ' + type;
      div.textContent = text;
      container.innerHTML = '';
      container.appendChild(div);
      
      setTimeout(() => {
        div.remove();
      }, 5000);
    }
  </script>
</body>
</html>`;
  }
}