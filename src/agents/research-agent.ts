import type { ResearchResult } from "../orchestrator/context-manager.js";
import { SerpService, type SearchResult } from "../services/serp.service.js";

export class ResearchAgent {
  private serpService: SerpService;
  private maxRetries: number;

  constructor(serpService: SerpService) {
    this.serpService = serpService;
    this.maxRetries = 3;
  }

  async execute(queries: string[]): Promise<ResearchResult[]> {
    console.log(`Executing research for ${queries.length} queries...`);

    const allResults: ResearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const query of queries) {
      const results = await this.executeQueryWithRetry(query);

      for (const result of results) {
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          allResults.push({
            url: result.url,
            text: `${result.title}\n${result.snippet}`,
          });
        }
      }
    }

    console.log(
      `Research completed: ${allResults.length} unique results from ${queries.length} queries`
    );

    return allResults;
  }

  private async executeQueryWithRetry(query: string): Promise<SearchResult[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(
          `Searching "${query}" (attempt ${attempt}/${this.maxRetries})...`
        );

        const results = await this.serpService.search(query);

        console.log(`Found ${results.length} results for "${query}"`);

        return results;
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt} failed for "${query}":`, error);

        if (attempt < this.maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    console.warn(
      `Failed to search "${query}" after ${this.maxRetries} attempts. Skipping.`
    );
    return [];
  }
}
