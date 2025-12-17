import { z } from "zod";

const articleInputSchema = z.object({
  title: z.string().min(1, "Title cannot be empty"),

  clientName: z.string().min(1, "Client name cannot be empty"),

  usps: z.string().min(1, "USPs cannot be empty"),

  minWordCount: z.optional(z.number().min(1000, "Minimum word count must be at least 1000")).default(1000),

  maxWordCount: z.optional(z.number().min(1000, "Minimum word count mustnot exceed 2000")).default(2000),

  clientGuidelines: z.string().min(1, "Client guidelines cannot be empty"),

  generalGuidelines: z.string().min(1, "General guidelines cannot be empty"),

  exampleArticle: z.string().min(1, "Example article cannot be empty"),

  outlineDescription: z.string().min(1, "Outline description cannot be empty"),
});

export type ArticleInput = z.infer<typeof articleInputSchema>;
