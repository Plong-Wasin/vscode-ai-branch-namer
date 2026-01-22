import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Error types for Git operations
 */
export class GitOperationError extends Error {
	constructor(message: string, public readonly code: string) {
		super(message);
		this.name = 'GitOperationError';
	}
}

/**
 * Git operations module for branch management
 */
export class GitOperations {
	/**
	 * Check if the current workspace is a Git repository
	 */
	public static async isGitRepository(): Promise<boolean> {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				return false;
			}

			await execAsync('git rev-parse --git-dir', {
				cwd: workspaceFolder.uri.fsPath
			});
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Get the current branch name
	 */
	public static async getCurrentBranch(): Promise<string | null> {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				return null;
			}

			const { stdout } = await execAsync('git branch --show-current', {
				cwd: workspaceFolder.uri.fsPath
			});
			return stdout.trim();
		} catch (error) {
			return null;
		}
	}

	/**
	 * Validate a branch name according to Git naming rules
	 * @param branchName - The branch name to validate
	 * @returns Object with valid flag and error message if invalid
	 */
	public static validateBranchName(branchName: string): { valid: boolean; error?: string } {
		// Check if branch name is empty
		if (!branchName || branchName.trim().length === 0) {
			return { valid: false, error: 'Branch name cannot be empty' };
		}

		// Check if branch name is too long (Git has a limit, but we'll use a reasonable limit)
		if (branchName.length > 255) {
			return { valid: false, error: 'Branch name is too long (max 255 characters)' };
		}

		// Check for invalid characters (Git branch names cannot contain: .., ~, ^, :, ?, *, [, spaces, control chars)
		const invalidChars = /[~^:?*\[\]\x00-\x1F\x7F]/;
		if (invalidChars.test(branchName)) {
			return { valid: false, error: 'Branch name contains invalid characters' };
		}

		// Check for consecutive dots or leading/trailing dots
		if (branchName.includes('..') || branchName.startsWith('.') || branchName.endsWith('.')) {
			return { valid: false, error: 'Branch name cannot contain consecutive dots or start/end with a dot' };
		}

		// Check for leading or trailing spaces
		if (branchName !== branchName.trim()) {
			return { valid: false, error: 'Branch name cannot have leading or trailing spaces' };
		}

		// Check for locked branch names
		const lockedNames = ['HEAD', 'FETCH_HEAD', 'ORIG_HEAD', 'MERGE_HEAD'];
		if (lockedNames.includes(branchName)) {
			return { valid: false, error: 'Branch name is reserved' };
		}

		return { valid: true };
	}

	/**
	 * Create a new branch using git switch -c command
	 * @param branchName - The name of the branch to create
	 * @throws GitOperationError if the branch creation fails
	 */
	public static async createBranch(branchName: string): Promise<void> {
		// Validate branch name first
		const validation = this.validateBranchName(branchName);
		if (!validation.valid) {
			throw new GitOperationError(validation.error || 'Invalid branch name', 'INVALID_NAME');
		}

		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			throw new GitOperationError('No workspace folder found', 'NO_WORKSPACE');
		}

		try {
			// Use git switch -c to create and switch to the new branch
			await execAsync(`git switch -c "${branchName}"`, {
				cwd: workspaceFolder.uri.fsPath
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			// Parse common Git error messages
			if (errorMessage.includes('already exists')) {
				throw new GitOperationError(
					`Branch '${branchName}' already exists`,
					'BRANCH_EXISTS'
				);
			}

			if (errorMessage.includes('not a git repository')) {
				throw new GitOperationError(
					'Not a Git repository',
					'NOT_GIT_REPO'
				);
			}

			throw new GitOperationError(
				`Failed to create branch: ${errorMessage}`,
				'CREATE_FAILED'
			);
		}
	}

	/**
	 * Check if a branch already exists
	 * @param branchName - The branch name to check
	 * @returns True if the branch exists, false otherwise
	 */
	public static async branchExists(branchName: string): Promise<boolean> {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				return false;
			}

			const { stdout } = await execAsync(`git branch --list "${branchName}"`, {
				cwd: workspaceFolder.uri.fsPath
			});
			return stdout.trim().length > 0;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Get the workspace root path
	 */
	public static getWorkspaceRoot(): string | null {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		return workspaceFolder?.uri.fsPath || null;
	}

	/**
	 * Get Git status (modified files, untracked files, etc.)
	 */
	public static async getGitStatus(): Promise<{
		modified: string[];
		untracked: string[];
		staged: string[];
	}> {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				return { modified: [], untracked: [], staged: [] };
			}

			const { stdout: modified } = await execAsync('git diff --name-only', {
				cwd: workspaceFolder.uri.fsPath
			});
			const { stdout: untracked } = await execAsync('git ls-files --others --exclude-standard', {
				cwd: workspaceFolder.uri.fsPath
			});
			const { stdout: staged } = await execAsync('git diff --cached --name-only', {
				cwd: workspaceFolder.uri.fsPath
			});

			return {
				modified: modified.trim().split('\n').filter(f => f),
				untracked: untracked.trim().split('\n').filter(f => f),
				staged: staged.trim().split('\n').filter(f => f)
			};
		} catch (error) {
			return { modified: [], untracked: [], staged: [] };
		}
	}

	/**
	 * Get git diff output for staged changes only
	 * @param maxLength - Maximum length of diff output before truncation (default: 2000)
	 * @returns Staged diff output with truncation if necessary
	 */
	public static async getGitDiff(maxLength: number = 2000): Promise<string> {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				return '';
			}

			// Get staged changes only
			const { stdout: staged } = await execAsync('git diff --cached', {
				cwd: workspaceFolder.uri.fsPath
			});

			let fullDiff = '';
			if (staged.trim()) {
				fullDiff += 'Staged changes:\n' + staged + '\n';
			}

			// Truncate if too long to prevent excessive token usage
			if (fullDiff.length > maxLength) {
				fullDiff = fullDiff.substring(0, maxLength) + '\n... (truncated)';
			}

			return fullDiff;
		} catch (error) {
			// Return empty string on error - graceful degradation
			return '';
		}
	}

	/**
	 * Check if there are any staged changes in the repository
	 * @returns True if staged files exist, false otherwise or on error
	 */
	public static async hasStagedChanges(): Promise<boolean> {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				return false;
			}

			// Execute git diff --cached --name-only to check for staged files
			const { stdout } = await execAsync('git diff --cached --name-only', {
				cwd: workspaceFolder.uri.fsPath
			});

			// Return true if there are any staged files (stdout will have content)
			return stdout.trim().length > 0;
		} catch (error) {
			// Return false on git command failures - graceful degradation
			return false;
		}
	}
}
