import { join } from "path";

export const PromptPaths = {
  OUTLINE_PROMPT: resolvePath("prompts/outline.txt"),
};

function resolvePath(relativePath: string) {
  return join(process.cwd(), relativePath);
}
