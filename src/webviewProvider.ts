import * as vscode from 'vscode';
import { ProviderFactory } from './providerFactory';
import { ProviderType } from './provider';
import { testConnection, listModels } from './aihandler';

export class AIHandlerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aihandler.settingsView';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {}

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

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'getConfig':
          await this._sendConfig();
          await this._sendProviderInfo();
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
          await vscode.commands.executeCommand('aihandler.resetSystemPrompt');
          await this._sendConfig();
          break;
      }
    });

    this._sendConfig();
    this._sendProviderInfo();
  }

  private async _sendConfig() {
    if (!this._view) {
      return;
    }

    const config = vscode.workspace.getConfiguration('aihandler');
    this._view.webview.postMessage({
      type: 'config',
      data: {
        provider: config.get<string>('provider', 'openwebui'),
        apiUrl: config.get<string>('apiUrl', ''),
        apiKey: config.get<string>('apiKey', ''),
        model: config.get<string>('model', ''),
        systemPrompt: config.get<string>('systemPrompt', ''),
        onlyStaged: config.get<boolean>('onlyStagedChanges', true)
      }
    });
  }

  private async _sendProviderInfo() {
    if (!this._view) {
      return;
    }

    const providers = ProviderFactory.getProviderInfo();
    this._view.webview.postMessage({
      type: 'providers',
      data: providers
    });
  }

  private async _updateConfig(key: string, value: string) {
    const config = vscode.workspace.getConfiguration('aihandler');
    await config.update(key, value, vscode.ConfigurationTarget.Global);

    if (key === 'provider' || key === 'apiUrl' || key === 'apiKey') {
      await this._context.globalState.update('aihandler.cachedModels', undefined);
    }

    vscode.window.showInformationMessage(`${key} updated successfully`);
  }

  private async _loadModels() {
    if (!this._view) {
      return;
    }

    try {
      const models = await listModels();

      await this._context.globalState.update('aihandler.cachedModels', models);
      
      this._view.webview.postMessage({
        type: 'models',
        data: models
      });
      
      vscode.window.showInformationMessage(`Loaded ${models.length} models successfully`);
    } catch (error: any) {
      this._view.webview.postMessage({
        type: 'error',
        message: error.message
      });
      vscode.window.showErrorMessage(`Failed to load models: ${error.message}`);
    }
  }

  private async _testConnection() {
    try {
      const success = await testConnection();
      
      if (success) {
        vscode.window.showInformationMessage('Connection successful!');
      } else {
        vscode.window.showErrorMessage('Connection failed');
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Connection failed: ${error.message}`);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Handler Settings</title>
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
    .info {
      font-size: 0.9em;
      color: var(--vscode-descriptionForeground);
      margin-top: -5px;
      margin-bottom: 10px;
    }
    .hidden {
      display: none;
    }
    .provider-badge {
      display: inline-block;
      padding: 2px 8px;
      margin: 2px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 3px;
      font-size: 0.85em;
    }
  </style>
</head>
<body>
  <h2>AI Commit Handler</h2>
  
  <div class="section">
    <label for="provider">AI Provider</label>
    <select id="provider">
      <option value="">Select provider...</option>
    </select>
    <div class="info" id="providerDescription"></div>
  </div>

  <div class="section" id="apiUrlSection">
    <label for="apiUrl">API URL</label>
    <input type="text" id="apiUrl" placeholder="http://localhost:8080">
    <div class="info">The URL of your AI service</div>
  </div>

  <div class="section">
    <label for="apiKey">API Key</label>
    <input type="password" id="apiKey" placeholder="Enter API key">
    <div class="info">Required for cloud providers, optional for self-hosted</div>
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
    <label>
      <input type="checkbox" id="onlyStaged">
      Generate commit message only from staged changes
    </label>
    <div class="info">
      If enabled, only <code>git diff --cached</code> is used.
    </div>
  </div>


  <div class="section">
    <label for="systemPrompt">System Prompt</label>
    <textarea id="systemPrompt" placeholder="Enter system prompt..."></textarea>
    <div class="info">Instructions for the AI when generating commit messages</div>
    <button id="resetSystemPrompt" class="secondary">Reset to Default</button>
  </div>

  <div class="section">
    <button id="saveAll">Save All Settings</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let currentConfig = {};
    let providers = [];

    vscode.postMessage({ type: 'getConfig' });

    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.type) {
        case 'config':
          currentConfig = message.data;
          updateUI(message.data);
          break;
        
        case 'providers':
          providers = message.data;
          populateProviders(message.data);
          break;
        
        case 'models':
          populateModels(message.data);
          break;
        
        case 'error':
          console.error(message.message);
          break;
      }
    });

    function updateUI(config) {
      document.getElementById('provider').value = config.provider || '';
      document.getElementById('apiUrl').value = config.apiUrl || '';
      document.getElementById('apiKey').value = config.apiKey || '';
      document.getElementById('model').value = config.model || '';
      document.getElementById('systemPrompt').value = config.systemPrompt || '';
      document.getElementById('onlyStaged').checked = !!config.onlyStaged;

      updateProviderUI(config.provider);
    }

    function populateProviders(providerList) {
      const select = document.getElementById('provider');
      select.innerHTML = '<option value="">Select provider...</option>';
      
      providerList.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.name;
        select.appendChild(option);
      });
      
      if (currentConfig.provider) {
        select.value = currentConfig.provider;
        updateProviderUI(currentConfig.provider);
      }
    }

    function updateProviderUI(providerId) {
      const provider = providers.find(p => p.id === providerId);
      const apiUrlSection = document.getElementById('apiUrlSection');
      const apiUrlInput = document.getElementById('apiUrl');
      const descEl = document.getElementById('providerDescription');
      
      if (provider) {
        descEl.textContent = provider.description;
        
        if (provider.requiresUrl) {
          apiUrlSection.classList.remove('hidden');
          if (provider.defaultUrl && !apiUrlInput.value) {
            apiUrlInput.value = provider.defaultUrl;
          }
        } else {
          apiUrlSection.classList.add('hidden');
        }
      } else {
        descEl.textContent = '';
        apiUrlSection.classList.add('hidden');
      }
    }

    function populateModels(models) {
      const select = document.getElementById('model');
      const savedModel = currentConfig.model;
      
      select.innerHTML = '<option value="">Select a model...</option>';
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        select.appendChild(option);
      });
      
      if (savedModel && models.includes(savedModel)) {
        select.value = savedModel;
      }
    }

    document.getElementById('provider').addEventListener('change', (e) => {
      const value = e.target.value;
      vscode.postMessage({ type: 'updateConfig', key: 'provider', value });
      updateProviderUI(value);
    });

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

    document.getElementById('loadModels').addEventListener('click', () => {
      vscode.postMessage({ type: 'loadModels' });
    });

    document.getElementById('testConnection').addEventListener('click', () => {
      vscode.postMessage({ type: 'testConnection' });
    });

    document.getElementById('onlyStaged').addEventListener('change', (e) => {
      vscode.postMessage({
        type: 'updateConfig',
        key: 'onlyStagedChanges',
        value: e.target.checked
      });
    });

    document.getElementById('saveAll').addEventListener('click', () => {
      const data = {
        provider: document.getElementById('provider').value,
        apiUrl: document.getElementById('apiUrl').value,
        apiKey: document.getElementById('apiKey').value,
        model: document.getElementById('model').value,
        systemPrompt: document.getElementById('systemPrompt').value
      };

      Object.entries(data).forEach(([key, value]) => {
        vscode.postMessage({ type: 'updateConfig', key, value });
      });
    });

    document.getElementById('resetSystemPrompt').addEventListener('click', () => {
      vscode.postMessage({ type: 'resetSystemPrompt' });
    });
  </script>
</body>
</html>`;
  }
}