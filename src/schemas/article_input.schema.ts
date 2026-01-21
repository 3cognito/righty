import { z } from "zod";

const payload = z.object({
  title: z.string().min(1, "Title cannot be empty"),
  clientName: z.string().min(1, "Client name cannot be empty"),
  type: z.enum(
    ["listicle", "regular", "comparison"],
    "Please enter the article type"
  ),
  minWordCount: z
    .optional(z.number().min(1000, "Minimum word count must be at least 1000"))
    .default(1000),
  maxWordCount: z
    .optional(z.number().min(1000, "Maximum word count must not exceed 2000"))
    .default(2000),
  preferredSources: z.optional(
    z.array(z.string()).max(5, "Maximum 5 sources allowed")
  ),
});

export type EndpointPayload = z.infer<typeof payload>;
