import * as vscode from 'vscode';
import { AIService, AIServiceError, loadAIConfiguration } from './aiService';
import { GitOperations, GitOperationError } from './gitOperations';

/**
 * UI Handlers for BranchAI extension
 */
export class UIHandlers {
	/**
	 * Generate branch names and show quick pick selection
	 */
	public static async generateAndSelectBranch(): Promise<void> {
		// Check if we're in a Git repository
		const isGitRepo = await GitOperations.isGitRepository();
		if (!isGitRepo) {
			vscode.window.showErrorMessage(
				'BranchAI: Not a Git repository. Please open a Git repository to use this feature.',
				'Open Settings',
				'Cancel'
			).then(selection => {
				if (selection === 'Open Settings') {
					this.openSettings();
				}
			});
			return;
		}

		// Validate that there are staged changes
		const hasStaged = await GitOperations.hasStagedChanges();
		if (!hasStaged) {
			vscode.window.showWarningMessage(
				'BranchAI: No staged changes detected. Please stage your changes using \'git add\' or the VS Code Source Control view.',
				'Open Source Control',
				'Cancel'
			).then(selection => {
				if (selection === 'Open Source Control') {
					vscode.commands.executeCommand('workbench.view.scm');
				}
			});
			return;
		}

		// Load AI configuration
		const aiConfig = loadAIConfiguration();
		const aiService = new AIService(aiConfig);

		// Validate configuration
		const validation = aiService.validateConfiguration();
		if (!validation.valid) {
			vscode.window.showWarningMessage(
				`BranchAI: Configuration incomplete. Please configure: ${validation.missing.join(', ')}`,
				'Open Settings',
				'Cancel'
			).then(selection => {
				if (selection === 'Open Settings') {
					this.openSettings();
				}
			});
			return;
		}

		// Show progress indicator
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: 'BranchAI',
				cancellable: false
			},
			async (progress) => {
				progress.report({ increment: 0, message: 'Generating branch name suggestions...' });

				try {
					// Get current branch for context
					const currentBranch = await GitOperations.getCurrentBranch();

					// Get git diff for rich context about staged changes only
					progress.report({ increment: 20, message: 'Analyzing staged changes...' });
					const gitDiff = await GitOperations.getGitDiff();

					// Build context for AI
					let context = '';
					if (currentBranch) {
						context += `Current branch: ${currentBranch}`;
					}

					// Add git diff if available (provides rich context about staged changes)
					if (gitDiff) {
						context += `\n\n${gitDiff}`;
					} else {
						// Fallback to file lists if diff is not available
						const gitStatus = await GitOperations.getGitStatus();
						if (gitStatus.staged.length > 0) {
							context += `\nStaged files: ${gitStatus.staged.slice(0, 5).join(', ')}`;
						}
						if (gitStatus.modified.length > 0) {
							context += `\nModified files: ${gitStatus.modified.slice(0, 5).join(', ')}`;
						}
					}

					// Generate branch names using configured suggestion count
					progress.report({ increment: 50, message: 'Calling AI service...' });
					const suggestions = await aiService.generateBranchNames(context, undefined, aiConfig.suggestionCount);

					progress.report({ increment: 100, message: 'Branch names generated!' });

					// Show quick pick with suggestions
					await this.showBranchSelection(suggestions);
				} catch (error) {
					progress.report({ increment: 100, message: 'Error occurred' });

					if (error instanceof AIServiceError) {
						this.handleAIServiceError(error);
					} else if (error instanceof Error) {
						vscode.window.showErrorMessage(
							`BranchAI: ${error.message}`,
							'Open Settings',
							'Cancel'
						).then(selection => {
							if (selection === 'Open Settings') {
								this.openSettings();
							}
						});
					}
				}
			}
		);
	}

	/**
	 * Generate branch names from user-provided commit message
	 */
	public static async generateBranchFromCommitMessage(): Promise<void> {
		// Check if we're in a Git repository
		const isGitRepo = await GitOperations.isGitRepository();
		if (!isGitRepo) {
			vscode.window.showErrorMessage(
				'BranchAI: Not a Git repository. Please open a Git repository to use this feature.',
				'Open Settings',
				'Cancel'
			).then(selection => {
				if (selection === 'Open Settings') {
					this.openSettings();
				}
			});
			return;
		}

		// Load AI configuration
		const aiConfig = loadAIConfiguration();
		const aiService = new AIService(aiConfig);

		// Validate configuration
		const validation = aiService.validateConfiguration();
		if (!validation.valid) {
			vscode.window.showWarningMessage(
				`BranchAI: Configuration incomplete. Please configure: ${validation.missing.join(', ')}`,
				'Open Settings',
				'Cancel'
			).then(selection => {
				if (selection === 'Open Settings') {
					this.openSettings();
				}
			});
			return;
		}

		// Show input dialog for commit message (supports multi-line input)
		const commitMessage = await vscode.window.showInputBox({
			prompt: 'Enter your commit message to generate branch name',
			placeHolder: 'Add user authentication feature. This commit adds login form, OAuth integration, and session management.',
			value: '',
			ignoreFocusOut: true,
			validateInput: (value: string) => {
				if (!value || value.trim().length === 0) {
					return 'Commit message cannot be empty';
				}
				if (value.trim().length > 2000) {
					return 'Commit message is too long (max 2000 characters)';
				}
				return null;
			}
		});

		// Handle user cancellation
		if (commitMessage === undefined) {
			vscode.window.showInformationMessage('BranchAI: Operation cancelled');
			return;
		}

		// Show progress indicator
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: 'BranchAI',
				cancellable: false
			},
			async (progress) => {
				progress.report({ increment: 0, message: 'Generating branch name suggestions...' });

				try {
					// Get current branch for additional context
					const currentBranch = await GitOperations.getCurrentBranch();
					let context = '';
					if (currentBranch) {
						context = `Current branch: ${currentBranch}`;
					}

					// Generate branch names using commit message as primary context
					progress.report({ increment: 50, message: 'Calling AI service...' });
					const suggestions = await aiService.generateBranchNames(context, commitMessage, aiConfig.suggestionCount);

					progress.report({ increment: 100, message: 'Branch names generated!' });

					// Show quick pick with suggestions
					await this.showBranchSelection(suggestions);
				} catch (error) {
					progress.report({ increment: 100, message: 'Error occurred' });

					if (error instanceof AIServiceError) {
						this.handleAIServiceError(error);
					} else if (error instanceof Error) {
						vscode.window.showErrorMessage(
							`BranchAI: ${error.message}`,
							'Open Settings',
							'Cancel'
						).then(selection => {
							if (selection === 'Open Settings') {
								this.openSettings();
							}
						});
					}
				}
			}
		);
	}

	/**
	 * Show quick pick with branch name suggestions
	 */
	private static async showBranchSelection(suggestions: string[]): Promise<void> {
		const items: vscode.QuickPickItem[] = suggestions.map(suggestion => ({
			label: suggestion,
			description: 'AI-generated suggestion'
		}));

		// Add Cancel option
		items.push({
			label: 'Cancel',
			description: 'Close without creating a branch'
		});

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select a branch name to create',
			ignoreFocusOut: true
		});

		if (!selected || selected.label === 'Cancel') {
			vscode.window.showInformationMessage('BranchAI: Operation cancelled');
			return;
		}

		// Create the selected branch
		await this.createBranch(selected.label);
	}

	/**
	 * Create a branch with the given name
	 */
	private static async createBranch(branchName: string): Promise<void> {
		try {
			// Validate branch name
			const validation = GitOperations.validateBranchName(branchName);
			if (!validation.valid) {
				vscode.window.showErrorMessage(
					`BranchAI: ${validation.error}`,
					'Cancel'
				);
				return;
			}

			// Check if branch already exists
			const exists = await GitOperations.branchExists(branchName);
			if (exists) {
				vscode.window.showWarningMessage(
					`Branch '${branchName}' already exists. Would you like to switch to it?`,
					'Switch',
					'Cancel'
				).then(selection => {
					if (selection === 'Switch') {
						this.switchToBranch(branchName);
					}
				});
				return;
			}

			// Create the branch
			await GitOperations.createBranch(branchName);
			vscode.window.showInformationMessage(
				`BranchAI: Successfully created and switched to branch '${branchName}'`
			);
		} catch (error) {
			if (error instanceof GitOperationError) {
				this.handleGitOperationError(error);
			} else if (error instanceof Error) {
				vscode.window.showErrorMessage(
					`BranchAI: Failed to create branch: ${error.message}`,
					'Cancel'
				);
			}
		}
	}

	/**
	 * Switch to an existing branch
	 */
	private static async switchToBranch(branchName: string): Promise<void> {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				vscode.window.showErrorMessage('No workspace folder found');
				return;
			}

			const { exec } = require('child_process');
			const { promisify } = require('util');
			const execAsync = promisify(exec);

			await execAsync(`git switch "${branchName}"`, {
				cwd: workspaceFolder.uri.fsPath
			});

			vscode.window.showInformationMessage(
				`BranchAI: Successfully switched to branch '${branchName}'`
			);
		} catch (error) {
			vscode.window.showErrorMessage(
				`BranchAI: Failed to switch to branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'Cancel'
			);
		}
	}

	/**
	 * Handle AI service errors
	 */
	private static handleAIServiceError(error: AIServiceError): void {
		let message = `BranchAI: ${error.message}`;

		switch (error.code) {
			case 'CONFIG_ERROR':
				vscode.window.showWarningMessage(
					message,
					'Open Settings',
					'Cancel'
				).then(selection => {
					if (selection === 'Open Settings') {
						this.openSettings();
					}
				});
				break;

			case 'TIMEOUT_ERROR':
				vscode.window.showErrorMessage(
					`${message}. Please check your network connection and try again.`,
					'Open Settings',
					'Cancel'
				).then(selection => {
					if (selection === 'Open Settings') {
						this.openSettings();
					}
				});
				break;

			case 'API_ERROR':
				vscode.window.showErrorMessage(
					`${message}. Please check your API configuration and try again.`,
					'Open Settings',
					'Cancel'
				).then(selection => {
					if (selection === 'Open Settings') {
						this.openSettings();
					}
				});
				break;

			default:
				vscode.window.showErrorMessage(
					message,
					'Cancel'
				);
				break;
		}
	}

	/**
	 * Handle Git operation errors
	 */
	private static handleGitOperationError(error: GitOperationError): void {
		let message = `BranchAI: ${error.message}`;

		switch (error.code) {
			case 'BRANCH_EXISTS':
				vscode.window.showWarningMessage(
					message,
					'Cancel'
				);
				break;

			case 'NOT_GIT_REPO':
				vscode.window.showErrorMessage(
					message,
					'Cancel'
				);
				break;

			case 'INVALID_NAME':
				vscode.window.showWarningMessage(
					message,
					'Cancel'
				);
				break;

			default:
				vscode.window.showErrorMessage(
					message,
					'Cancel'
				);
				break;
		}
	}

	/**
	 * Open BranchAI settings
	 */
	public static openSettings(): void {
		vscode.commands.executeCommand('workbench.action.openSettings', '@ext:branchai');
	}
}
