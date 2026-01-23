import * as vscode from 'vscode';
import { UIHandlers } from './uiHandlers';
import { AIService, loadAIConfiguration } from './aiService';

/**
 * This method is called when your extension is activated
 * Your extension is activated the very first time the command is executed
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('BranchAI extension is now active!');

	// Initialize UI handlers with extension context
	UIHandlers.initialize(context);

	// Register the generate branch name command
	const generateBranchCommand = vscode.commands.registerCommand(
		'branchai.generateBranchName',
		() => {
			UIHandlers.generateAndSelectBranch();
		}
	);

	// Register the generate branch from commit message command
	const generateBranchFromCommitMessageCommand = vscode.commands.registerCommand(
		'branchai.generateBranchFromCommitMessage',
		() => {
			UIHandlers.generateBranchFromCommitMessage();
		}
	);

	// Register the open settings command
	const openSettingsCommand = vscode.commands.registerCommand(
		'branchai.openSettings',
		() => {
			UIHandlers.openSettings();
		}
	);

	// Add commands to subscriptions
	context.subscriptions.push(generateBranchCommand, generateBranchFromCommitMessageCommand, openSettingsCommand);

	// Validate configuration on activation and show warning if needed
	validateConfigurationOnActivation(context);
}

/**
 * Validate configuration when extension activates
 */
function validateConfigurationOnActivation(context: vscode.ExtensionContext): void {
	const aiConfig = loadAIConfiguration();
	const aiService = new AIService(aiConfig);
	const validation = aiService.validateConfiguration();

	if (!validation.valid) {
		// Show a notification after a short delay to not interrupt startup
		setTimeout(() => {
			vscode.window.showWarningMessage(
				`BranchAI: Configure your AI settings to get started (${validation.missing.join(', ')})`,
				'Open Settings',
				'Later'
			).then(selection => {
				if (selection === 'Open Settings') {
					UIHandlers.openSettings();
				}
			});
		}, 2000);
	}
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() {
	console.log('BranchAI extension is now deactivated');
}
