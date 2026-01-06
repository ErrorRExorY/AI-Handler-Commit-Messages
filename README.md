# OpenWebUI Commits

Generate intelligent Git commit messages using your own OpenWebUI instance - no expensive subscriptions required!

## Features

- **AI-Powered Commit Messages**: Automatically generate meaningful commit messages based on your staged changes
- **Self-Hosted**: Uses your own OpenWebUI instance, giving you full control over your data and costs
- **Smart Integration**: Seamlessly integrates into VS Code's Source Control UI
- **Customizable**: Configure API endpoint, model, and API key to match your setup

### Usage

1. Make changes to your code
2. Stage your changes in the Source Control view
3. Click the sparkle icon (✨) in the Source Control toolbar, or use the Command Palette (`Ctrl+Shift+P`) and search for "Generate Commit Message (OpenWebUI)"
4. The AI-generated commit message will appear in the commit message box
5. Review, edit if needed, and commit!

## Requirements

- **OpenWebUI Instance**: You need a running OpenWebUI instance (local or remote)
- **API Access**: Ensure your OpenWebUI instance has API access enabled
- **Git Repository**: Must be working in a Git repository

### Setting up OpenWebUI

If you don't have OpenWebUI running yet:

```bash
docker run -d -p 3000:8080 --name open-webui ghcr.io/open-webui/open-webui:main
```

Visit the [OpenWebUI documentation](https://docs.openwebui.com/) for more setup options.

## Extension Settings

Configure this extension through VS Code settings (`Ctrl+,`):

* `openwebui.apiUrl`: Your OpenWebUI base URL (default: `http://localhost:3000`)
* `openwebui.apiKey`: Your OpenWebUI API key (leave empty if not required)
* `openwebui.model`: The model to use for generating commits (default: `gpt-4o-mini`)

### Example Configuration

```json
{
  "openwebui.apiUrl": "http://localhost:3000",
  "openwebui.apiKey": "your-api-key-here",
  "openwebui.model": "llama3.2"
}
```

## Getting Your API Key

1. Open your OpenWebUI instance in a browser
2. Go to Settings → Account
3. Find the API Keys section
4. Create a new API key if needed
5. Copy and paste it into the extension settings

## Known Issues

- Large diffs may take longer to process depending on your model
- Ensure your OpenWebUI instance is accessible from VS Code (check firewalls/network settings)

## Release Notes

### 0.0.1

Initial release of OpenWebUI Commits:
- Generate commit messages from staged changes
- Configurable API endpoint and model
- Integration with VS Code Source Control UI

---

## Why This Extension?

Tired of paying for expensive AI coding assistants just to generate commit messages? With OpenWebUI Commits, you can use your own self-hosted AI models to generate high-quality commit messages at no additional cost. Perfect for developers who value:

- **Privacy**: Your code never leaves your infrastructure
- **Cost Control**: Use any model you want without subscription fees
- **Flexibility**: Switch between different AI models as needed

## Support

Found a bug or have a feature request? Please open an issue on the [GitHub repository](https://github.com/yourusername/owuicommits).

---

**Enjoy your AI-powered commits without the subscription costs!** ✨