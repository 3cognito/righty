import { PromptPaths } from "../../prompts/paths.js";
import type { ArticleInput } from "../schemas/article_input.schema.js";
import type { LLMService } from "../types/llm.js";
import { readTextFile } from "../utils/file.js";
import { sleep } from "../utils/time.js";

export class OutlineGenerator {
  private llmService: LLMService;
  private promptTemplatePath: string;
  private maxRetries: number;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
    this.promptTemplatePath = PromptPaths.OUTLINE_PROMPT;
    this.maxRetries = 3;
  }

  async generate(input: ArticleInput): Promise<string> {
    const prompt = this.buildPrompt(input);

    const outline = await this.generateWithRetry(prompt);

    // Step 4: Post-process and validate
    const finalOutline = this.postProcess(outline, input);

    return finalOutline;
  }

  private buildPrompt(input: ArticleInput): string {
    const template = readTextFile(this.promptTemplatePath);

    return template
      .replace("{{TITLE}}", input.title)
      .replace("{{CLIENT_NAME}}", input.clientName)
      .replace("{{USPS}}", input.usps)
      .replace("{{MIN_WORDS}}", input.minWordCount.toString())
      .replace("{{MAX_WORDS}}", input.maxWordCount.toString())
      .replace("{{CLIENT_GUIDELINES}}", input.clientGuidelines)
      .replace("{{GENERAL_GUIDELINES}}", input.generalGuidelines)
      .replace("{{EXAMPLE_ARTICLE}}", input.exampleArticle)
      .replace("{{OUTLINE_DESCRIPTION}}", input.outlineDescription);
  }

  private async generateWithRetry(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(
          `Generating outline (attempt ${attempt}/${this.maxRetries})...`
        );

        const response = await this.llmService.generate(prompt);
        //process response

        console.log("Outline generated successfully");

        return response.content;
      } catch (error) {
        //process error
        lastError = error as Error;
        console.error(`Attempt ${attempt} failed:`, error);

        if (attempt < this.maxRetries) {
          const waitTime = Math.pow(0.002, attempt) * 1000; // Exponential backoff
          console.log(`Waiting ${waitTime}ms before retry...`);
          await sleep(waitTime);
        }
      }
    }

    throw new Error(
      `Failed to generate outline after ${this.maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  private postProcess(outline: string, input: ArticleInput): string {
    //verify presence of certain sections

    return outline;
  }
}
