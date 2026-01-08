import * as vscode from 'vscode';
import { ProviderFactory } from './providerFactory';
import { ProviderType } from './provider';
import { testConnection, listModels } from './aihandler';

export class AIHandlerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aihandler.settingsView';
  private _view?: vscode.WebviewView;
  private _configTarget: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global;

  constructor(
  private readonly _extensionUri: vscode.Uri,
  private readonly _context: vscode.ExtensionContext
  ) {
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('aihandler')) {
        this._sendConfig();
        // Auto-load models wenn API-Key oder Provider sich ändert
        if (e.affectsConfiguration('aihandler.apiKey') || 
            e.affectsConfiguration('aihandler.provider')) {
          this._autoLoadModelsIfPossible();
        }
      }
    });
  }

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
          await this._sendLastModelUpdate();
          await this._sendConfigTarget();
          const cachedModels = this._context.globalState.get<string[]>(
            'aihandler.cachedModels'
          );
          if (cachedModels?.length) {
            webviewView.webview.postMessage({
              type: 'models',
              data: cachedModels
            });
          }
          // Auto-load models wenn möglich
          await this._autoLoadModelsIfPossible();
          break;
        
        case 'setConfigTarget':
          this._configTarget = data.target === 'workspace' 
            ? vscode.ConfigurationTarget.Workspace 
            : vscode.ConfigurationTarget.Global;
          await this._sendConfigTarget();
          await this._sendConfig();
          break;

        case 'saveAll':
          await this._saveAllSettings(data.data);
          vscode.window.showInformationMessage('AI Handler settings saved successfully.');
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

        case 'resetAllSettings':
          await this._resetAllSettings(data.scope);
          break;
      }
    });

    this._sendConfig();
    this._sendProviderInfo();
    this._sendLastModelUpdate();
    this._sendConfigTarget();
  }

  private async _autoLoadModelsIfPossible() {
    const config = vscode.workspace.getConfiguration('aihandler');
    const providerType = config.get<ProviderType>('provider');
    const apiKey = config.get<string>('apiKey') || '';
    
    let publicKey = '';
    if (providerType === ProviderType.PUBLIC) {
      publicKey = await this._context.secrets.get('aihandler.publicApiKey') ?? '';
    }

    // Prüfe ob wir einen API-Key haben
    const hasCredentials = 
      (providerType === ProviderType.PUBLIC && publicKey) ||
      (providerType !== ProviderType.PUBLIC && apiKey);

    if (hasCredentials) {
      // Lade Models nur wenn noch keine gecached sind
      const cachedModels = this._context.globalState.get<string[]>('aihandler.cachedModels');
      if (!cachedModels || cachedModels.length === 0) {
        await this._loadModels(true); // silent mode
      }
    }
  }

  private async _sendLastModelUpdate() {
    if (!this._view) {
      return;
    }

    const lastUpdate = this._context.globalState.get<number>('aihandler.lastModelUpdate');
    
    this._view.webview.postMessage({
      type: 'lastModelUpdate',
      data: lastUpdate || null
    });
  }

  private async _sendConfigTarget() {
    if (!this._view) {
      return;
    }

    const hasWorkspace = !!vscode.workspace.workspaceFolders;
    const targetName = this._configTarget === vscode.ConfigurationTarget.Workspace 
      ? 'workspace' 
      : 'user';

    this._view.webview.postMessage({
      type: 'configTarget',
      data: {
        current: targetName,
        hasWorkspace: hasWorkspace
      }
    });
  }

  private async _saveAllSettings(values: Record<string, any>) {
    const config = vscode.workspace.getConfiguration('aihandler');

    for (const [key, value] of Object.entries(values)) {
      await config.update(key, value, this._configTarget);
    }
  }

  private async _sendConfig() {
    if (!this._view) {
      return;
    }

    const config = vscode.workspace.getConfiguration('aihandler');
    
    // Inspect um herauszufinden, woher der Wert kommt
    const getEffectiveValue = (key: string) => {
      const inspection = config.inspect(key);
      if (this._configTarget === vscode.ConfigurationTarget.Workspace) {
        return inspection?.workspaceValue ?? inspection?.globalValue ?? inspection?.defaultValue;
      }
      return inspection?.globalValue ?? inspection?.defaultValue;
    };

    this._view.webview.postMessage({
      type: 'config',
      data: {
        provider: getEffectiveValue('provider') || 'openwebui',
        apiUrl: getEffectiveValue('apiUrl') || '',
        apiKey: getEffectiveValue('apiKey') || '',
        model: getEffectiveValue('model') || '',
        systemPrompt: getEffectiveValue('systemPrompt') || '',
        onlyStaged: getEffectiveValue('onlyStagedChanges') ?? true
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

  private async _updateConfig(key: string, value: any) {
    const config = vscode.workspace.getConfiguration('aihandler');

    if (key === 'provider') {
      if (!Object.values(ProviderType).includes(value)) {
        vscode.window.showErrorMessage(`Invalid provider: ${value}`);
        return;
      }
    }

    await config.update(key, value, this._configTarget);
  }

  private async _loadModels(silent: boolean = false) {
    if (!this._view) {
      return;
    }

    try {
      const models = await listModels();

      await this._context.globalState.update('aihandler.cachedModels', models);
      await this._context.globalState.update('aihandler.lastModelUpdate', Date.now());
      
      this._view.webview.postMessage({
        type: 'models',
        data: models
      });

      this._view.webview.postMessage({
        type: 'lastModelUpdate',
        data: Date.now()
      });
      
      if (!silent) {
        vscode.window.showInformationMessage(`Loaded ${models.length} models successfully`);
      }
    } catch (error: any) {
      this._view.webview.postMessage({
        type: 'error',
        message: error.message
      });
      if (!silent) {
        vscode.window.showErrorMessage(`Failed to load models: ${error.message}`);
      }
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

  private async _resetAllSettings(scopeName: string) {
    // Bestätigungsdialog über VSCode
    const confirmation = await vscode.window.showWarningMessage(
      `Are you sure you want to reset ALL AI Handler settings in ${scopeName} scope?\n\nThis will remove all custom configurations and restore defaults.`,
      { modal: true },
      'Yes, Reset All',
      'Cancel'
    );

    if (confirmation !== 'Yes, Reset All') {
      return;
    }

    const config = vscode.workspace.getConfiguration('aihandler');

    try {
      // Liste aller AI Handler Settings
      const settingsToReset = [
        'provider',
        'apiUrl',
        'apiKey',
        'model',
        'systemPrompt',
        'onlyStagedChanges'
      ];

      // Setze jede Setting auf undefined (entfernt den Wert)
      for (const setting of settingsToReset) {
        await config.update(setting, undefined, this._configTarget);
      }

      // Wenn Workspace-Scope, auch gecachte Models löschen
      if (this._configTarget === vscode.ConfigurationTarget.Workspace) {
        await this._context.globalState.update('aihandler.cachedModels', undefined);
        await this._context.globalState.update('aihandler.lastModelUpdate', undefined);
      }

      vscode.window.showInformationMessage(
        `All AI Handler settings have been reset in ${scopeName} scope.`
      );

      // UI aktualisieren
      await this._sendConfig();
      await this._sendLastModelUpdate();

      if (this._view) {
        this._view.webview.postMessage({
          type: 'models',
          data: []
        });
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(
        `Failed to reset settings: ${error.message}`
      );
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
          min-height: 200px;
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
        button.danger {
          background: var(--vscode-inputValidation-errorBackground);
          color: var(--vscode-inputValidation-errorForeground);
          border: 1px solid var(--vscode-inputValidation-errorBorder);
        }
        button.danger:hover {
          opacity: 0.8;
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
        .refresh-container {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .last-update {
          font-size: 0.85em;
          color: var(--vscode-descriptionForeground);
        }
      </style>
    </head>
    <body>
      <h2>AI Commit Handler</h2>
      
      <div class="section">
        <label for="configTarget">Configuration Scope</label>
        <select id="configTarget">
          <option value="user">User Settings (Global)</option>
          <option value="workspace" id="workspaceOption">Workspace Settings</option>
        </select>
        <div class="info">Choose whether to save settings globally or per workspace</div>
      </div>

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

      <div class="section" id="apiKeySection">
        <label for="apiKey">API Key</label>
        <input type="password" id="apiKey" placeholder="Enter API key">
        <div class="info">Required for cloud providers, optional for self-hosted</div>
      </div>

      <div class="section">
        <button id="testConnection" class="secondary">Test Connection</button>
      </div>

      <div class="section">
        <label for="model">Model</label>
        <div class="refresh-container">
          <button id="refreshModels" class="secondary" title="Refresh models">⟳</button>
          <span class="last-update" id="lastUpdate">Never updated</span>
        </div>
        <select id="model">
          <option value="">Select a model...</option>
        </select>
        <div class="info">Models are loaded automatically when credentials are set</div>
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
        <button id="resetAllSettings" class="danger" title="Reset all AI Handler settings in current scope">Reset All Settings</button>
      </div>

      <div class="section">
        <button id="saveAll">Save All Settings</button>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        let currentConfig = {};
        let providers = [];
        let lastModelUpdate = null;
        let hasWorkspace = false;

        vscode.postMessage({ type: 'getConfig' });

        window.addEventListener('message', event => {
          const message = event.data;
          
          switch (message.type) {
            case 'config':
              currentConfig = message.data;
              updateUI(message.data);
              break;
            
            case 'configTarget':
              hasWorkspace = message.data.hasWorkspace;
              updateConfigTargetUI(message.data.current, message.data.hasWorkspace);
              break;
            
            case 'providers':
              providers = message.data;
              populateProviders(message.data);
              break;
            
            case 'models':
              populateModels(message.data);
              break;
            
            case 'lastModelUpdate':
              lastModelUpdate = message.data;
              updateLastUpdateDisplay();
              break;
            
            case 'error':
              console.error(message.message);
              break;
          }
        });

        function updateConfigTargetUI(current, hasWorkspace) {
          const select = document.getElementById('configTarget');
          const workspaceOption = document.getElementById('workspaceOption');
          
          select.value = current;
          
          if (!hasWorkspace) {
            workspaceOption.disabled = true;
            workspaceOption.textContent = 'Workspace Settings (No workspace open)';
            if (current === 'workspace') {
              select.value = 'user';
            }
          } else {
            workspaceOption.disabled = false;
            workspaceOption.textContent = 'Workspace Settings';
          }
        }

        function updateLastUpdateDisplay() {
          const el = document.getElementById('lastUpdate');
          if (!lastModelUpdate) {
            el.textContent = 'Never updated';
            return;
          }

          const now = Date.now();
          const diff = now - lastModelUpdate;
          const seconds = Math.floor(diff / 1000);
          const minutes = Math.floor(seconds / 60);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);

          if (seconds < 60) {
            el.textContent = 'Just now';
          } else if (minutes < 60) {
            el.textContent = \`\${minutes} minute\${minutes !== 1 ? 's' : ''} ago\`;
          } else if (hours < 24) {
            el.textContent = \`\${hours} hour\${hours !== 1 ? 's' : ''} ago\`;
          } else {
            el.textContent = \`\${days} day\${days !== 1 ? 's' : ''} ago\`;
          }
        }

        // Update time display every minute
        setInterval(updateLastUpdateDisplay, 60000);

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
          const apiKeySection = document.getElementById('apiKeySection');
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

            if (provider.requiresApiKey) {
              apiKeySection.classList.remove('hidden');
            } else {
              apiKeySection.classList.add('hidden');
            }
          } else {
            descEl.textContent = '';
            apiUrlSection.classList.add('hidden');
            apiKeySection.classList.add('hidden');
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

        document.getElementById('configTarget').addEventListener('change', (e) => {
          const target = e.target.value;
          vscode.postMessage({ type: 'setConfigTarget', target });
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

        document.getElementById('refreshModels').addEventListener('click', () => {
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
          vscode.postMessage({
            type: 'saveAll',
            data: {
              provider: document.getElementById('provider').value,
              apiUrl: document.getElementById('apiUrl').value,
              apiKey: document.getElementById('apiKey').value,
              model: document.getElementById('model').value,
              systemPrompt: document.getElementById('systemPrompt').value
            }
          });
        });

        document.getElementById('resetSystemPrompt').addEventListener('click', () => {
          vscode.postMessage({ type: 'resetSystemPrompt' });
        });

        document.getElementById('resetAllSettings').addEventListener('click', () => {
          const scopeName = document.getElementById('configTarget').value === 'workspace' 
            ? 'workspace' 
            : 'user';
          
          vscode.postMessage({ 
            type: 'resetAllSettings',
            scope: scopeName
          });
        });
      </script>
    </body>
    </html>`;
  }
}