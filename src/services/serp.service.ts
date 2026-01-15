import { getJson } from "serpapi";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class SerpService {
  private apiKey: string;
  private maxResultsPerQuery: number;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(
        "SerpAPI key is required. Set SERPAPI_KEY environment variable or pass apiKey in config."
      );
    }
    this.apiKey = apiKey;
    this.maxResultsPerQuery = 5;
  }

  async search(query: string): Promise<SearchResult[]> {
    try {
      const response = await getJson({
        api_key: this.apiKey,
        engine: "google",
        q: query,
        num: this.maxResultsPerQuery,
      });

      const organicResults = response.organic_results || [];

      return organicResults.slice(0, this.maxResultsPerQuery).map(
        (result: {
          title?: string;
          link?: string;
          snippet?: string;
        }): SearchResult => ({
          title: result.title || "",
          url: result.link || "",
          snippet: result.snippet || "",
        })
      );
    } catch (error) {
      console.error(`Search failed for query "${query}":`, error);
      throw error;
    }
  }

  async searchMultiple(queries: string[]): Promise<Map<string, SearchResult[]>> {
    const results = new Map<string, SearchResult[]>();

    for (const query of queries) {
      console.log(`Searching: "${query}"`);
      const searchResults = await this.search(query);
      results.set(query, searchResults);
    }

    return results;
  }
}
