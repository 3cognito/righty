import { join } from "path";

export const PromptPaths = {
  OUTLINE_PROMPT: resolvePath("prompts/outline.txt"),
  RESEARCH_PLANNER_PROMPT: resolvePath("prompts/research_planner.txt"),
};

function resolvePath(relativePath: string) {
  return join(process.cwd(), relativePath);
}
