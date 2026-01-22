# BranchAI

AI-powered Git branch name generator for VSCode.

## Overview

BranchAI helps developers create meaningful, consistent branch names that follow best practices. Using AI-powered suggestions, you can generate contextually relevant, well-formatted branch names based on your current codebase and changes being made.

## Features

- **AI-Powered Suggestions**: Generate branch name suggestions using OpenAI-compatible APIs
- **Dual Input Modes**: Generate branch names from git diff OR user-provided commit messages
- **Configurable Suggestion Count**: Choose how many suggestions to generate (1-10)
- **Git Diff Context**: Analyzes actual code changes for more accurate branch names
- **Conventional Branch Naming**: Follows Git branching conventions (feature/, bugfix/, hotfix/, etc.)
- **Quick Pick UI**: Easy-to-use interface for selecting and creating branches
- **Git Integration**: Seamlessly creates branches using `git switch -c`
- **Flexible Configuration**: Support for any OpenAI-compatible API provider
- **Context Awareness**: Considers your current Git status and diff when generating suggestions

## Installation

1. Install the extension from the VSCode Marketplace
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Run "BranchAI: Open Settings" to configure your AI provider

## Configuration

BranchAI requires configuration to connect to your AI service provider. Configure the following settings in VSCode:

### Required Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `branchai.apiKey` | Your API key for the AI service | (empty) |
| `branchai.apiEndpoint` | Base URL for the OpenAI-compatible API endpoint | `https://api.openai.com/v1` |
| `branchai.model` | Model name to use for generating branch names | `gpt-3.5-turbo` |

### Optional Settings

| Setting | Description | Default | Range |
|---------|-------------|---------|-------|
| `branchai.timeout` | Request timeout in milliseconds | `30000` (30s) | 5000-120000 |
| `branchai.temperature` | Temperature for AI response randomness | `0.7` | 0-2 |
| `branchai.suggestionCount` | Number of branch name suggestions to generate | `5` | 1-10 |
| `branchai.defaultInputMode` | Default input mode for generating branch names | `diff` | diff, commit-message |

### Configuration Example

```json
{
  "branchai.apiEndpoint": "https://api.openai.com/v1",
  "branchai.apiKey": "sk-your-api-key-here",
  "branchai.model": "gpt-3.5-turbo",
  "branchai.timeout": 30000,
  "branchai.temperature": 0.7,
  "branchai.suggestionCount": 5,
  "branchai.defaultInputMode": "diff"
}
```

### Supported AI Providers

BranchAI works with any OpenAI-compatible API provider:

- **OpenAI**: Use the default endpoint `https://api.openai.com/v1`
- **Azure OpenAI**: Configure your Azure OpenAI endpoint
- **Local LLMs**: Use services like Ollama, LM Studio, or any local OpenAI-compatible server
- **Other Providers**: Any service that implements the OpenAI API format

## Usage

### Generate a Branch Name

1. Open a Git repository in VSCode
2. **Stage your changes** using `git add` or VSCode's Source Control view (recommended for best results)
3. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
4. Run "BranchAI: Generate Branch Name"
5. Wait for AI to generate suggestions (a progress indicator will show)
6. Select a branch name from the quick pick list
7. The branch will be created and you'll automatically switch to it

> **Tip**: For the most accurate branch name suggestions, stage your changes before generating branch names. BranchAI analyzes only staged changes to provide contextually relevant suggestions.

### Example Branch Names

BranchAI generates conventional branch names like:

- `feature/user-authentication`
- `bugfix/login-error-handling`
- `hotfix/security-vulnerability`
- `refactor/code-cleanup`
- `docs/readme-update`
- `test/unit-tests-addition`
- `chore/dependency-update`

### How Git Diff Improves Accuracy

By analyzing **staged** code changes through `git diff --cached`, BranchAI generates more relevant and accurate branch names:

**Without staged changes (fallback to file lists):**
- Staged files: (none)
- Modified files: `auth.ts`, `user.ts`, `login.ts`
- Suggestion: `feature/code-update` (generic)

**With staged changes:**
- Staged diff shows: Added JWT token validation, fixed password hashing, added login form
- Suggestion: `feature/jwt-authentication` (specific and accurate)

The staged diff context helps the AI understand:
- What functionality is being added or modified
- The nature of the changes (bugfix, feature, refactor)
- Specific components or modules affected
- The technical implementation details

> **Why staged changes only?** Staging changes represents your intentional, cohesive unit of work. This excludes work-in-progress code and experimental changes, resulting in more accurate branch name suggestions and reduced API token usage.

### Generate a Branch Name from Commit Message

You can also generate branch names by providing your own commit message, which is useful when:
- Planning work before writing code
- The git diff doesn't accurately represent your intent
- You want more control over branch naming

1. Open a Git repository in VSCode
2. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Run "BranchAI: Generate Branch Name (from Commit Message)"
4. Enter your commit message describing the work
5. Wait for AI to generate suggestions (a progress indicator will show)
6. Select a branch name from the quick pick list
7. The branch will be created and you'll automatically switch to it

### Example Commit Messages and Generated Branch Names

**Single-line commit message:**
- Input: "Add user authentication feature"
- Suggestion: `feature/user-authentication`

**Multi-line commit message:**
- Input: "Fix login error handling\n\nThis commit adds proper error handling for:\n- Invalid credentials\n- Network timeouts\n- Server errors"
- Suggestion: `bugfix/login-error-handling`

**Bullet point style:**
- Input: "Refactor code cleanup: remove unused imports, optimize database queries, improve error messages"
- Suggestion: `refactor/code-cleanup-optimization`

### Diff-Based vs. Commit Message-Based Generation

**Diff-Based Generation (Default):**
- ✅ Best when you have actual code changes
- ✅ Automatically analyzes what you've changed
- ✅ No manual input required
- ✅ Captures implementation details
- ✅ Only analyzes staged changes (excludes work-in-progress)
- ❌ Requires code changes to exist
- ❌ Requires staging changes for best results

**Commit Message-Based Generation:**
- ✅ Works before writing any code
- ✅ Gives you full control over context
- ✅ Captures your intended work precisely
- ✅ Great for planning and documentation
- ❌ Requires manual input
- ❌ Depends on quality of your description

**When to use each approach:**
- Use **diff-based** when: You've already made and staged changes and want accurate branch names based on actual code
- Use **commit message** when: You're planning work, want to describe intent, or diff doesn't represent your goals

**Best Practice**: Always stage your changes before using diff-based generation for the most accurate suggestions.

## How It Works

1. **Context Analysis**: BranchAI analyzes your current Git status (staged changes, modified files, current branch)
2. **AI Generation**: Sends the context to your configured AI service with a carefully crafted prompt
3. **Smart Filtering**: The AI generates branch name suggestions following conventional patterns based on configured count
4. **User Selection**: You select the best suggestion from a quick pick interface
5. **Branch Creation**: The selected branch is created using `git switch -c`

**Important**: BranchAI only analyzes **staged changes** when generating branch names. If no changes are staged, it falls back to listing modified files. This ensures suggestions are based on your intentional work rather than work-in-progress code.

## Troubleshooting

### "Configuration incomplete" Error

**Problem**: You see a warning that configuration is incomplete.

**Solution**: Open BranchAI settings and configure the required fields:
- API Key
- API Endpoint
- Model

### "Not a Git repository" Error

**Problem**: The extension reports that you're not in a Git repository.

**Solution**: Ensure you have a Git repository open in VSCode. You can initialize a new repository with:
```bash
git init
```

### "Request timeout" Error

**Problem**: The AI request times out.

**Solutions**:
- Check your network connection
- Increase the timeout setting in configuration
- Verify your API endpoint is correct and accessible

### "API request failed" Error

**Problem**: The API returns an error.

**Solutions**:
- Verify your API key is correct
- Check if you have sufficient API quota
- Ensure the model name is correct for your provider
- Review the API endpoint URL

### Branch Already Exists

**Problem**: The selected branch name already exists.

**Solution**: BranchAI will offer to switch to the existing branch instead of creating a new one.

### Invalid Branch Name

**Problem**: The generated branch name is invalid.

**Solution**: This is rare, but if it happens, try generating suggestions again. The AI will typically generate valid names.

## Development

### Building the Extension

```bash
# Install dependencies
pnpm install

# Compile TypeScript
pnpm run compile

# Run tests
pnpm run test

# Lint code
pnpm run lint
```

### Project Structure

```
branchai/
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── aiService.ts          # AI service integration
│   ├── gitOperations.ts      # Git operations wrapper
│   ├── uiHandlers.ts         # UI interaction handlers
│   └── test/
│       ├── aiService.test.ts # AI service tests
│       └── gitOperations.test.ts # Git operations tests
├── openspec/                 # OpenSpec change proposals
├── package.json              # Extension manifest
└── README.md                 # This file
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write tests for new functionality
5. Ensure all tests pass (`pnpm test`)
6. Ensure code passes linting (`pnpm lint`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [VSCode Extension API](https://code.visualstudio.com/api)
- Uses OpenAI-compatible APIs for AI-powered suggestions
- Follows conventional Git branching best practices

## Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/yourusername/branchai/issues)
3. Create a new issue with detailed information about your problem

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.
