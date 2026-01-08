# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/)
and adheres to Semantic Versioning.

---

## [1.1.0] – 2026-01-07

### Added
- Support for multiple AI providers:
  - OpenAI
  - Anthropic
  - Google (Gemini)
  - Ollama (local models)
- Centralized `providerFactory` for dynamic provider selection
- Unified provider interface
- Extensive provider-specific test coverage
- Improved prompt abstraction and reuse
- Configuration option to generate commit messages from **staged changes only** or from **all working tree changes**

### Changed
- Refactored provider architecture
- Clear separation of prompt logic and provider implementations
- Improved overall test coverage (unit and integration)

### Fixed
- Stability improvements in provider request handling
- More robust error handling for Git operations

---

## [1.0.0] – 2026-01-06

### Added
- Initial release of the extension
- Support for **OpenWebUI** as the only AI provider
- Automatic commit message generation based on `git diff`
- Webview-based user interface
- Basic test coverage