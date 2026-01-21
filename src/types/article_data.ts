export enum ArticleType {
  LISTICLE = "listicle",
  REGULAR = "regular",
  COMPARISON = "comparison",
}

export interface IArticle {
  title: string;
  clientName: string;
  usps: string;
  client_guidelines: string;
  example_article: string;
  outline_description: string;
  general_guidelines: string;
  type: ArticleType;
  minWordCount?: number;
  maxWordCount?: number;
  preferredSources?: string[];
}
