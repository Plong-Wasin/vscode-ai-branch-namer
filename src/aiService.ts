import * as vscode from 'vscode';

/**
 * Valid reasoning effort values for AI models that support extended thinking
 */
export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

/**
 * Configuration interface for AI service settings
 */
export interface AIConfiguration {
	apiEndpoint: string;
	apiKey: string;
	model: string;
	timeout: number;
	temperature: number;
	suggestionCount: number;
	reasoningEffort?: ReasoningEffort;
}

/**
 * Error types for AI service operations
 */
export class AIServiceError extends Error {
	constructor(message: string, public readonly code: string) {
		super(message);
		this.name = 'AIServiceError';
	}
}

/**
 * AI Service for generating branch name suggestions using OpenAI-compatible APIs
 */
export class AIService {
	private readonly config: AIConfiguration;
	private readonly maxRetries: number = 3;
	private readonly retryDelay: number = 1000; // 1 second

	constructor(config: AIConfiguration) {
		this.config = config;
	}

	/**
	 * Validate the AI configuration
	 */
	public validateConfiguration(): { valid: boolean; missing: string[]; invalid: string[] } {
		const missing: string[] = [];
		const invalid: string[] = [];

		if (!this.config.apiKey) {
			missing.push('API Key');
		}
		if (!this.config.apiEndpoint) {
			missing.push('API Endpoint');
		}
		if (!this.config.model) {
			missing.push('Model');
		}

		// Validate reasoning_effort if provided
		if (this.config.reasoningEffort) {
			const validReasoningEfforts: ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'];
			if (!validReasoningEfforts.includes(this.config.reasoningEffort)) {
				invalid.push(`Reasoning Effort (invalid value: ${this.config.reasoningEffort})`);
			}
		}

		return {
			valid: missing.length === 0 && invalid.length === 0,
			missing,
			invalid
		};
	}

	/**
	 * Generate branch name suggestions using AI
	 * @param context - Optional context about the work being done (git diff or other context)
	 * @param commitMessage - Optional commit message to use as primary context
	 * @param count - Optional number of suggestions to generate (defaults to config.suggestionCount)
	 * @returns Array of branch name suggestions
	 */
	public async generateBranchNames(context?: string, commitMessage?: string, count?: number): Promise<string[]> {
		// Validate configuration
		const validation = this.validateConfiguration();
		if (!validation.valid) {
			const errors: string[] = [];
			if (validation.missing.length > 0) {
				errors.push(`Missing: ${validation.missing.join(', ')}`);
			}
			if (validation.invalid.length > 0) {
				errors.push(`Invalid: ${validation.invalid.join(', ')}`);
			}
			throw new AIServiceError(
				`Configuration error. ${errors.join('; ')}`,
				'CONFIG_ERROR'
			);
		}

		// Use provided count or default to config value
		const suggestionCount = count || this.config.suggestionCount;

		const prompt = this.buildPrompt(context, commitMessage, suggestionCount);

		// Retry logic for transient failures
		let lastError: Error | null = null;
		for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
			try {
				const response = await this.callAI(prompt);
				console.log(`Response from AI: ${JSON.stringify(response, null, 2)}`);
				return this.parseResponse(response, suggestionCount);
			} catch (error) {
				lastError = error as Error;
				const isTransient = this.isTransientError(error as Error);

				if (isTransient && attempt < this.maxRetries) {
					// Exponential backoff
					const delay = this.retryDelay * Math.pow(2, attempt);
					await this.sleep(delay);
					continue;
				}

				if (!isTransient) {
					// Non-transient error, don't retry
					break;
				}
			}
		}

		throw new AIServiceError(
			`Failed to generate branch names after ${this.maxRetries + 1} attempts: ${lastError?.message}`,
			'API_ERROR'
		);
	}

	/**
	 * Build the system prompt for branch name generation
	 * @param context - Optional context about the work being done (git diff or other context)
	 * @param commitMessage - Optional commit message to use as primary context
	 * @param count - Number of suggestions to generate
	 */
	private buildPrompt(context?: string, commitMessage?: string, count: number = 5): string {
		let prompt = `You are a helpful assistant that generates Git branch names. Generate ${count} branch name suggestions based on the user's work context.

Requirements:
- Use conventional branch naming prefixes: feature/, bugfix/, hotfix/, refactor/, docs/, test/, chore/
- Use kebab-case for the branch name
- Keep names concise but descriptive (max 50 characters)
- Follow the format: prefix/description
- Ensure each suggestion is unique
- Analyze the provided context to understand the work being done

Output format: Return only the ${count} branch names, one per line, in order of relevance.`;

		// Prioritize commit message over git diff when provided
		if (commitMessage && commitMessage.trim()) {
			prompt += `

Commit message context:
${commitMessage.trim()}`;
		} else if (context && context.trim()) {
			prompt += `

Git diff context:
${context.trim()}`;
		}

		return prompt;
	}

	/**
	 * Call the OpenAI-compatible API
	 */
	private async callAI(prompt: string): Promise<string> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
		console.log(prompt);
		try {
			// Build request body
			const requestBody: any = {
				model: this.config.model,
				messages: [
					{
						role: 'system',
						content: prompt
					}
				],
				temperature: this.config.temperature,
				max_tokens: 200
			};

			// Include reasoning_effort if configured (for models that support it)
			if (this.config.reasoningEffort) {
				requestBody.reasoning_effort = this.config.reasoningEffort;
			}

			const response = await fetch(`${this.config.apiEndpoint}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.config.apiKey}`
				},
				body: JSON.stringify(requestBody),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				throw new AIServiceError(
					`API request failed with status ${response.status}: ${errorText}`,
					'API_ERROR'
				);
			}

			const data = await response.json() as {
				choices?: Array<{
					message?: {
						content?: string;
					};
				}>;
			};

			if (!data.choices || !data.choices[0] || !data.choices[0].message) {
				throw new AIServiceError('Invalid API response format', 'API_ERROR');
			}

			return data.choices[0].message.content || '';
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof Error && error.name === 'AbortError') {
				throw new AIServiceError('Request timeout', 'TIMEOUT_ERROR');
			}

			throw error;
		}
	}

	/**
	 * Parse the AI response into an array of branch names
	 * @param response - The AI response string
	 * @param count - Maximum number of suggestions to return
	 */
	private parseResponse(response: string, count: number = 5): string[] {
		const lines = response
			.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 0);

		if (lines.length === 0) {
			throw new AIServiceError('No branch names generated', 'PARSE_ERROR');
		}

		// Return up to the requested number of suggestions
		return lines.slice(0, count);
	}

	/**
	 * Check if an error is transient (should retry)
	 */
	private isTransientError(error: Error): boolean {
		const message = error.message.toLowerCase();
		return (
			message.includes('timeout') ||
			message.includes('econnreset') ||
			message.includes('econnrefused') ||
			message.includes('etimedout') ||
			message.includes('503') ||
			message.includes('502') ||
			message.includes('429')
		);
	}

	/**
	 * Sleep for a specified duration
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Get the masked API key for logging (only shows first 3 characters)
	 */
	public getMaskedApiKey(): string {
		if (!this.config.apiKey) {
			return '';
		}
		return this.config.apiKey.substring(0, 3) + '***';
	}
}

/**
 * Load AI configuration from VSCode settings
 */
export function loadAIConfiguration(): AIConfiguration {
	const config = vscode.workspace.getConfiguration('branchai');
	const suggestionCount = config.get<number>('suggestionCount', 5);
	const model = config.get<string>('model', 'gpt-3.5-turbo');
	
	// Validate suggestion count is within range (1-10)
	const validatedCount = Math.max(1, Math.min(10, suggestionCount));
	
	// Load and validate reasoning effort
	const reasoningEffort = config.get<string>('reasoningEffort', 'medium');
	const validReasoningEfforts: ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'];
	let validatedReasoningEffort: ReasoningEffort | undefined;
	
	if (validReasoningEfforts.includes(reasoningEffort as ReasoningEffort)) {
		validatedReasoningEffort = reasoningEffort as ReasoningEffort;
	}
	
	// Apply model-specific default logic for reasoning effort
	if (!validatedReasoningEffort) {
		if (model === 'gpt-5.1') {
			validatedReasoningEffort = 'none';
		} else if (model === 'gpt-5-pro') {
			validatedReasoningEffort = 'high';
		} else {
			validatedReasoningEffort = 'medium';
		}
	}
	
	return {
		apiEndpoint: config.get<string>('apiEndpoint', 'https://api.openai.com/v1'),
		apiKey: config.get<string>('apiKey', ''),
		model: model,
		timeout: config.get<number>('timeout', 30000),
		temperature: config.get<number>('temperature', 0.7),
		suggestionCount: validatedCount,
		reasoningEffort: validatedReasoningEffort
	};
}
