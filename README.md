# AI Handler – Commit Messages

AI Handler – Commit Messages is a Visual Studio Code extension that **automatically generates high-quality Git commit messages** using multiple AI providers — similar in spirit to GitHub Copilot, but **provider-agnostic**.

The extension analyzes the current Git changes and produces clear, consistent, and context-aware commit messages.

---

## ✨ Features

- Automatic commit message generation based on `git diff`
- Support for multiple AI providers
- Unified prompt logic across all providers
- Easily extensible provider architecture
- Webview-based user interface
- Comprehensive unit and integration test coverage

---

## 🤖 Supported AI Providers

As of version **1.1.0**, the extension supports multiple providers:

- **OpenWebUI**
- **OpenAI**
- **Anthropic**
- **Google (Gemini)**
- **Ollama** (local models)

Providers are selected via a centralized factory (`providerFactory`), making it easy to add new providers in the future.

---

## 🧠 How It Works

1. **Detecting Git Changes**  
   The extension reads the current Git repository state and determines the diff that should be used as input:
   - Either **only staged changes**
   - Or **all working tree changes**  
   
   This behavior is configurable by the user and allows precise control over what content is used to generate the commit message.

2. **System Prompt Handling**  
   A system prompt is applied to guide the AI in generating high-quality commit messages.
   - A **default system prompt** is set when the extension is first activated
   - Users may **customize the system prompt** at any time
   - It is **recommended to use the default prompt**, as it is optimized for commit message generation
   - The system prompt can be **reset to the default at any time**

3. **Prompt Construction**  
   The selected Git diff (staged or full) is combined with the system prompt and transformed into a structured request payload.

4. **Provider Execution**  
   The request is sent to the **currently selected AI provider** via its API:
   - OpenWebUI
   - OpenAI
   - Anthropic
   - Google (Gemini)
   - Ollama (local models)

   All providers implement a unified interface, ensuring consistent behavior regardless of the backend.

5. **Response Handling**  
   The AI provider responds with a generated commit message, which is then returned to the extension and displayed to the user for review and acceptance.

---

## 🛠️ Project Structure (Excerpt)

```text
src/
 ├─ extension.ts              # VS Code entry point
 ├─ aihandler.ts               # Core orchestration logic
 ├─ provider.ts                # Provider interface
 ├─ providerFactory.ts         # Provider creation logic
 ├─ providers/                 # AI provider implementations
 │   ├─ openwebui.ts
 │   ├─ openai.ts
 │   ├─ anthropic.ts
 │   ├─ google.ts
 │   └─ ollama.ts
 ├─ git.ts                     # Git integration
 ├─ prompt.ts                  # Prompt construction
 └─ defaultSystemPrompt.ts     # Default system prompt
````

---

## 🧪 Testing

The project includes extensive test coverage:

* Provider-specific tests
* Provider factory tests
* Git integration tests
* Prompt validation tests
* Full extension integration tests

Examples:

```text
src/test/providers/openai.test.ts
src/test/providerFactory.test.ts
src/test/extension.integration.test.ts
```

---

## 📦 Installation

### Install via VSIX (local)

```bash
code --install-extension ai-handler-commit-messages-1.1.0.vsix
```

### Marketplace

*(Optional, if published)*

---

## ⚙️ Requirements

* Visual Studio Code ≥ 1.80
* Git installed and available in PATH
* Configured API access for the selected provider
* For Ollama: a locally running Ollama server

---

## 📜 License

This project is licensed under the MIT License.
See [LICENSE](./LICENSE) for details.

---

## 🚀 Roadmap (Optional)

* Provider-specific prompt customization
* Conventional Commits support
* Inline diff preview
* Streaming responses
