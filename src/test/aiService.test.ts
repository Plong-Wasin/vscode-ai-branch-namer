import * as assert from 'assert';
import * as vscode from 'vscode';
import { AIService, AIConfiguration, loadAIConfiguration, ReasoningEffort } from '../aiService';

// Mock vscode module
suite('AIService - Reasoning Effort Configuration', () => {
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

	suite('loadAIConfiguration', () => {
		test('should load reasoning_effort from VSCode settings', () => {
			// Mock vscode.workspace.getConfiguration
			const mockConfig = {
				get: (key: string, defaultValue: any) => {
					const configMap: any = {
						'apiEndpoint': 'https://api.openai.com/v1',
						'apiKey': 'test-key',
						'model': 'gpt-4',
						'timeout': 30000,
						'temperature': 0.7,
						'suggestionCount': 5,
						'reasoningEffort': 'high'
					};
					return configMap[key] !== undefined ? configMap[key] : defaultValue;
				}
			};
			(vscode.workspace.getConfiguration as any) = () => mockConfig;

			const config = loadAIConfiguration();
			assert.strictEqual(config.reasoningEffort, 'high');
		});

		test('should validate reasoning_effort values', () => {
			// Test with invalid reasoning_effort
			const mockConfig = {
				get: (key: string, defaultValue: any) => {
					const configMap: any = {
						'apiEndpoint': 'https://api.openai.com/v1',
						'apiKey': 'test-key',
						'model': 'gpt-4',
						'timeout': 30000,
						'temperature': 0.7,
						'suggestionCount': 5,
						'reasoningEffort': 'invalid-value'
					};
					return configMap[key] !== undefined ? configMap[key] : defaultValue;
				}
			};
			(vscode.workspace.getConfiguration as any) = () => mockConfig;

			const config = loadAIConfiguration();
			// Should fall back to default 'medium' for invalid value
			assert.strictEqual(config.reasoningEffort, 'medium');
		});

		test('should apply model-specific defaults for gpt-5.1', () => {
			const mockConfig = {
				get: (key: string, defaultValue: any) => {
					const configMap: any = {
						'apiEndpoint': 'https://api.openai.com/v1',
						'apiKey': 'test-key',
						'model': 'gpt-5.1',
						'timeout': 30000,
						'temperature': 0.7,
						'suggestionCount': 5,
						'reasoningEffort': undefined
					};
					return configMap[key] !== undefined ? configMap[key] : defaultValue;
				}
			};
			(vscode.workspace.getConfiguration as any) = () => mockConfig;

			const config = loadAIConfiguration();
			assert.strictEqual(config.reasoningEffort, 'none');
		});

		test('should apply model-specific defaults for gpt-5-pro', () => {
			const mockConfig = {
				get: (key: string, defaultValue: any) => {
					const configMap: any = {
						'apiEndpoint': 'https://api.openai.com/v1',
						'apiKey': 'test-key',
						'model': 'gpt-5-pro',
						'timeout': 30000,
						'temperature': 0.7,
						'suggestionCount': 5,
						'reasoningEffort': undefined
					};
					return configMap[key] !== undefined ? configMap[key] : defaultValue;
				}
			};
			(vscode.workspace.getConfiguration as any) = () => mockConfig;

			const config = loadAIConfiguration();
			assert.strictEqual(config.reasoningEffort, 'high');
		});

		test('should apply default medium for other models', () => {
			const mockConfig = {
				get: (key: string, defaultValue: any) => {
					const configMap: any = {
						'apiEndpoint': 'https://api.openai.com/v1',
						'apiKey': 'test-key',
						'model': 'gpt-4',
						'timeout': 30000,
						'temperature': 0.7,
						'suggestionCount': 5,
						'reasoningEffort': undefined
					};
					return configMap[key] !== undefined ? configMap[key] : defaultValue;
				}
			};
			(vscode.workspace.getConfiguration as any) = () => mockConfig;

			const config = loadAIConfiguration();
			assert.strictEqual(config.reasoningEffort, 'medium');
		});

		test('should accept all valid reasoning_effort values', () => {
			const validValues: ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'];
			
			for (const value of validValues) {
				const mockConfig = {
					get: (key: string, defaultValue: any) => {
						const configMap: any = {
							'apiEndpoint': 'https://api.openai.com/v1',
							'apiKey': 'test-key',
							'model': 'gpt-4',
							'timeout': 30000,
							'temperature': 0.7,
							'suggestionCount': 5,
							'reasoningEffort': value
						};
						return configMap[key] !== undefined ? configMap[key] : defaultValue;
					}
				};
				(vscode.workspace.getConfiguration as any) = () => mockConfig;

				const config = loadAIConfiguration();
				assert.strictEqual(config.reasoningEffort, value);
			}
		});
	});

	suite('validateConfiguration', () => {
		test('should pass validation with valid reasoning_effort', () => {
			const config: AIConfiguration = {
				apiEndpoint: 'https://api.openai.com/v1',
				apiKey: 'test-key',
				model: 'gpt-4',
				timeout: 30000,
				temperature: 0.7,
				suggestionCount: 5,
				reasoningEffort: 'high',
				maxCompletionTokens: 200
			};

			const service = new AIService(config);
			const validation = service.validateConfiguration();
			assert.strictEqual(validation.valid, true);
			assert.strictEqual(validation.missing.length, 0);
			assert.strictEqual(validation.invalid.length, 0);
		});

		test('should pass validation without reasoning_effort', () => {
			const config: AIConfiguration = {
				apiEndpoint: 'https://api.openai.com/v1',
				apiKey: 'test-key',
				model: 'gpt-4',
				timeout: 30000,
				temperature: 0.7,
				suggestionCount: 5,
				maxCompletionTokens: 200
			};

			const service = new AIService(config);
			const validation = service.validateConfiguration();
			assert.strictEqual(validation.valid, true);
			assert.strictEqual(validation.missing.length, 0);
			assert.strictEqual(validation.invalid.length, 0);
		});

		test('should fail validation with invalid reasoning_effort', () => {
			const config: AIConfiguration = {
				apiEndpoint: 'https://api.openai.com/v1',
				apiKey: 'test-key',
				model: 'gpt-4',
				timeout: 30000,
				temperature: 0.7,
				suggestionCount: 5,
				reasoningEffort: 'invalid' as any,
				maxCompletionTokens: 200
			};

			const service = new AIService(config);
			const validation = service.validateConfiguration();
			assert.strictEqual(validation.valid, false);
			assert.strictEqual(validation.invalid.length, 1);
			assert.ok(validation.invalid[0].includes('Reasoning Effort'));
		});

		test('should report both missing and invalid fields', () => {
			const config: AIConfiguration = {
				apiEndpoint: 'https://api.openai.com/v1',
				apiKey: '',
				model: 'gpt-4',
				timeout: 30000,
				temperature: 0.7,
				suggestionCount: 5,
				reasoningEffort: 'invalid' as any,
				maxCompletionTokens: 200
			};

			const service = new AIService(config);
			const validation = service.validateConfiguration();
			assert.strictEqual(validation.valid, false);
			assert.ok(validation.missing.includes('API Key'));
			assert.ok(validation.invalid[0].includes('Reasoning Effort'));
		});
	});

	suite('backward compatibility', () => {
		test('should work without reasoning_effort field', () => {
			const config: AIConfiguration = {
				apiEndpoint: 'https://api.openai.com/v1',
				apiKey: 'test-key',
				model: 'gpt-3.5-turbo',
				timeout: 30000,
				temperature: 0.7,
				suggestionCount: 5,
				maxCompletionTokens: 200
			};

			const service = new AIService(config);
			const validation = service.validateConfiguration();
			assert.strictEqual(validation.valid, true);
		});

		test('should handle undefined reasoning_effort gracefully', () => {
			const mockConfig = {
				get: (key: string, defaultValue: any) => {
					const configMap: any = {
						'apiEndpoint': 'https://api.openai.com/v1',
						'apiKey': 'test-key',
						'model': 'gpt-3.5-turbo',
						'timeout': 30000,
						'temperature': 0.7,
						'suggestionCount': 5
					};
					return configMap[key] !== undefined ? configMap[key] : defaultValue;
				}
			};
			(vscode.workspace.getConfiguration as any) = () => mockConfig;

			const config = loadAIConfiguration();
			assert.strictEqual(config.reasoningEffort, 'medium');
		});
	});
});
