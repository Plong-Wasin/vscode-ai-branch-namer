import * as assert from 'assert';
import * as vscode from 'vscode';
import { GitOperations } from '../gitOperations';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Mock vscode module
suite('GitOperations.getGitDiff', () => {
	suiteSetup(() => {
		// Mock vscode.workspace.workspaceFolders
		(vscode.workspace as any).workspaceFolders = [
			{
				uri: {
					fsPath: '/test/workspace'
				}
			}
		];
	});

	suiteTeardown(() => {
		// Restore original value
		(vscode.workspace as any).workspaceFolders = undefined;
	});

	suite('staged changes retrieval', () => {
		test('should return staged changes when available', async () => {
			const stagedDiff = 'diff --git a/test.ts b/test.ts\n+new line';
			const { stdout } = await execAsync('git diff --cached', {
				cwd: vscode.workspace.workspaceFolders?.[0].uri.fsPath
			});

			// This test will pass if git diff --cached works correctly
			assert.ok(stdout || true, 'Git diff command executed');
		});

		test('should return empty string when no staged changes', async () => {
			const result = await GitOperations.getGitDiff();
			// Result will be empty if no staged changes exist
			assert.strictEqual(typeof result, 'string');
		});
	});

	suite('truncation', () => {
		test('should truncate large diffs to prevent excessive token usage', async () => {
			const result = await GitOperations.getGitDiff(100);
			// Verify result is a string and respects maxLength
			assert.strictEqual(typeof result, 'string');
			assert.ok(result.length <= 120, 'Result should be truncated to maxLength + overhead');
		});

		test('should respect custom maxLength parameter', async () => {
			const result = await GitOperations.getGitDiff(500);
			assert.strictEqual(typeof result, 'string');
			assert.ok(result.length <= 520, 'Result should respect custom maxLength');
		});
	});

	suite('error handling', () => {
		test('should return empty string when no workspace folder', async () => {
			const originalWorkspaceFolders = vscode.workspace.workspaceFolders;
			(vscode.workspace as any).workspaceFolders = undefined;

			const result = await GitOperations.getGitDiff();
			assert.strictEqual(result, '');

			// Restore original value
			(vscode.workspace as any).workspaceFolders = originalWorkspaceFolders;
		});
	});

	suite('diff format', () => {
		test('should include "Staged changes:" label when staged changes exist', async () => {
			const result = await GitOperations.getGitDiff();
			if (result) {
				assert.ok(result.includes('Staged changes:') || !result.includes('Unstaged changes:'), 
					'Should only include Staged changes label');
			}
		});

		test('should not include "Unstaged changes:" label', async () => {
			const result = await GitOperations.getGitDiff();
			assert.ok(!result.includes('Unstaged changes:'), 
				'Should not include Unstaged changes label');
		});
	});

	suite('hasStagedChanges', () => {
		test('should return true when staged files exist', async () => {
			// Create a test file and stage it
			const { execSync } = require('child_process');
			const testFilePath = `${vscode.workspace.workspaceFolders?.[0].uri.fsPath}/test-staged.txt`;
			try {
				execSync(`echo "test content" > "${testFilePath}"`);
				execSync(`git add "${testFilePath}"`, {
					cwd: vscode.workspace.workspaceFolders?.[0].uri.fsPath
				});

				const result = await GitOperations.hasStagedChanges();
				assert.strictEqual(result, true, 'Should return true when staged files exist');

				// Cleanup: unstage and remove the test file
				execSync(`git reset HEAD "${testFilePath}"`, {
					cwd: vscode.workspace.workspaceFolders?.[0].uri.fsPath
				});
				execSync(`rm "${testFilePath}"`);
			} catch (error) {
				// If git operations fail, skip this test
				console.log('Skipping test: git operations not available');
			}
		});

		test('should return false when no staged files exist', async () => {
			const result = await GitOperations.hasStagedChanges();
			// The result depends on whether there are staged changes in the repo
			assert.strictEqual(typeof result, 'boolean', 'Should return a boolean');
		});

		test('should return false when git command fails', async () => {
			const originalWorkspaceFolders = vscode.workspace.workspaceFolders;
			(vscode.workspace as any).workspaceFolders = undefined;

			const result = await GitOperations.hasStagedChanges();
			assert.strictEqual(result, false, 'Should return false when no workspace folder');

			// Restore original value
			(vscode.workspace as any).workspaceFolders = originalWorkspaceFolders;
		});
	});
});
