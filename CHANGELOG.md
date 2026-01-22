# Changelog

All notable changes to the BranchAI extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3] - 2026-01-22

### Added
- Validation for staged changes before generating branch names
- `hasStagedChanges()` method in `GitOperations` class to detect staged files
- User-friendly warning message when no staged changes are detected
- Option to open VS Code Source Control view from the warning dialog
- Unit tests for `hasStagedChanges()` method covering all scenarios

### Changed
- Branch generation now validates for staged changes before calling AI service
- Improved user experience with clear guidance when no changes are staged
- Graceful error handling for git status check failures

### Technical Details
- Added `hasStagedChanges()` method that executes `git diff --cached --name-only`
- Modified `generateAndSelectBranch()` to check for staged changes after Git repository validation
- Returns false on git command failures for graceful degradation
- Tests cover scenarios: staged files exist, no staged files, and git command failures

## [0.0.2] - 2026-01-22

### Changed
- Modified git diff retrieval to use only staged changes (`git diff --cached`)
- Updated progress message from "Analyzing git changes..." to "Analyzing staged changes..."
- Prioritized staged files over modified files in fallback context
- Improved branch name suggestion accuracy by excluding work-in-progress code
- Reduced API token consumption by excluding unstaged changes

### Added
- Unit tests for `getGitDiff()` method covering staged changes, truncation, and error handling
- Integration tests for branch generation workflow with staged-only diff
- Documentation updates explaining staged-only behavior and best practices

### Technical Details
- Removed retrieval of unstaged changes from `GitOperations.getGitDiff()`
- Updated `UIHandlers.generateAndSelectBranch()` to handle simplified diff output
- Fallback logic now lists staged files before modified files when no staged diff is available

### Migration Notes
- Users should stage their changes before generating branch names for best results
- No breaking changes to API surface, but behavior has changed to only analyze staged changes
- Existing workflow remains compatible, but staging changes is now recommended for accuracy

## [0.0.1] - 2025-01-22

### Added
- Initial release of BranchAI extension
- AI-powered branch name generation using OpenAI-compatible APIs
- Quick pick UI for selecting from 5 AI-generated suggestions
- Git integration for creating branches using `git switch -c`
- Configuration settings for AI service (API endpoint, API key, model, timeout, temperature)
- Support for conventional branch naming prefixes (feature/, bugfix/, hotfix/, refactor/, docs/, test/, chore/)
- Context-aware suggestions based on current Git status
- Configuration validation on extension activation
- Error handling for API failures, Git errors, and configuration issues
- Retry logic with exponential backoff for transient API failures
- Request timeout handling
- Branch name validation according to Git naming rules
- Unit tests for AI service and Git operations modules
- Comprehensive documentation in README.md

### Features
- **AI Integration**: Flexible support for any OpenAI-compatible API provider (OpenAI, Azure OpenAI, local LLMs, etc.)
- **Smart Suggestions**: Generates contextually relevant branch names based on modified files, staged changes, and current branch
- **User-Friendly UI**: Progress indicators, clear error messages, and intuitive quick pick interface
- **Secure Configuration**: API keys stored securely in VSCode settings, never logged
- **Graceful Degradation**: Works even when AI is not configured with helpful error messages

### Commands
- `branchai.generateBranchName`: Generate AI-powered branch name suggestions and create a branch
- `branchai.openSettings`: Quick access to BranchAI configuration settings

### Configuration
- `branchai.apiEndpoint`: Base URL for the OpenAI-compatible API endpoint (default: `https://api.openai.com/v1`)
- `branchai.apiKey`: API key for authentication
- `branchai.model`: Model name to use (default: `gpt-3.5-turbo`)
- `branchai.timeout`: Request timeout in milliseconds (default: `30000`, range: `5000-120000`)
- `branchai.temperature`: Temperature for AI response randomness (default: `0.7`, range: `0-2`)

### Technical Details
- Built with TypeScript for type safety
- Uses VSCode Extension API for seamless integration
- Implements retry logic with exponential backoff for resilience
- Comprehensive error handling with user-friendly messages
- Modular architecture with separate modules for AI service, Git operations, and UI handlers
