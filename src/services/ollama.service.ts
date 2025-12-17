import {
  LLMService,
  type LLMGenerateOptions,
  type LLMResponse,
} from "../types/llm.js";
import { Ollama } from "ollama";

const BASE_MODEL_OLLAMA = "gemma3";

export class OllamaService extends LLMService {
  private client: Ollama;
  private baseModel: string;

  constructor() {
    super();
    this.client = new Ollama();
    this.baseModel = BASE_MODEL_OLLAMA;
  }

  async generate(
    prompt: string,
    options?: LLMGenerateOptions
  ): Promise<LLMResponse> {
    const response = await this.client.generate({
      model: options?.model || this.baseModel,
      prompt,
    });

    return {
      content: response.response,
      model: response.model,
      tokensUsed:
        (response.prompt_eval_count || 0) + (response.eval_count || 0),
      finishReason: response.done ? "stop" : "length",
      createdAt: response.created_at,
      totalDuration: response.total_duration,
      evalCount: response.eval_count,
      promptEvalCount: response.prompt_eval_count,
      promptEvalDuration: response.prompt_eval_duration,
      eval_duration: response.eval_duration,
    };
  }
}
