export interface LLMGenerateOptions {
  maxTokens?: number;
  model?: string;
}

export interface LLMResponse {
  content: string;
  tokensUsed?: number;
  model: string;
  finishReason?: string;
  createdAt?: Date; //ISO 8601 timestamp of response creation
  totalDuration?: number; //Time spent loading the model in nanoseconds
  evalCount?: number;
  promptEvalCount?: number; //Number of input tokens in the prompt
  promptEvalDuration?: number; // Time spent evaluating the prompt in nanoseconds
  eval_duration?: number; //Time spent generating tokens in nanoseconds
}

export interface LLMError extends Error {
  code: string;
  statusCode?: number;
  retryable: boolean;
}

export abstract class LLMService {
  abstract generate(
    prompt: string,
    options?: LLMGenerateOptions
  ): Promise<LLMResponse>;
}
