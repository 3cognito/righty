import z from "zod";

export const WorkflowStageSchema = z.enum([
  "initialized",
  "research_query_generation",
  "research_execution",
  "outline_generation",
  "draft_generation",
  "completed",
]);

export const StageStatusSchema = z.enum([
  "in_progress",
  "awaiting_approval",
  "approved",
  "rejected",
  "completed",
  "failed",
]);

export const WorkflowStateSchema = z.object({
  stage: WorkflowStageSchema,
  status: StageStatusSchema,
});

export type WorkflowStage = z.infer<typeof WorkflowStageSchema>;
export type StageStatus = z.infer<typeof StageStatusSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

export function createState(
  stage: WorkflowStage,
  status: StageStatus
): WorkflowState {
  return { stage, status };
}

/**
 * Check if in a specific stage
 */
export function isInStage(state: WorkflowState, stage: WorkflowStage): boolean {
  return state.stage === stage;
}

export function isStageComplete(state: WorkflowState): boolean {
  return state.status === "completed" || state.status === "approved";
}

export function isStageFailed(state: WorkflowState): boolean {
  return state.status === "failed" || state.status === "rejected";
}

export function getStateDescription(state: WorkflowState): string {
  const stageNames: Record<WorkflowStage, string> = {
    initialized: "Initialization",
    research_query_generation: "Research Query Generation",
    research_execution: "Research Execution",
    outline_generation: "Outline Generation",
    draft_generation: "Draft Generation",
    completed: "Completed",
  };

  const statusDescriptions: Record<StageStatus, string> = {
    in_progress: "in progress",
    awaiting_approval: "awaiting approval",
    approved: "approved",
    rejected: "rejected",
    completed: "completed",
    failed: "failed",
  };

  return `${stageNames[state.stage]} - ${statusDescriptions[state.status]}`;
}

export const STATES = {
  INITIALIZED: createState("initialized", "completed"),

  RESEARCH_QUERY_GENERATING: createState(
    "research_query_generation",
    "in_progress"
  ),
  RESEARCH_QUERY_GENERATED: createState(
    "research_query_generation",
    "completed"
  ),
  RESEARCH_QUERY_AWAITING_APPROVAL: createState(
    "research_query_generation",
    "awaiting_approval"
  ),
  RESEARCH_QUERY_APPROVED: createState("research_query_generation", "approved"),
  RESEARCH_QUERY_REJECTED: createState("research_query_generation", "rejected"),
  RESEARCH_QUERY_FAILED: createState("research_query_generation", "failed"),

  RESEARCH_STARTED: createState("research_execution", "in_progress"),
  RESEARCH_COMPLETED: createState("research_execution", "completed"),
  RESEARCH_FAILED: createState("research_execution", "failed"),

  OUTLINE_GENERATING: createState("outline_generation", "in_progress"),
  OUTLINE_GENERATED: createState("outline_generation", "completed"),
  OUTLINE_AWAITING_APPROVAL: createState(
    "outline_generation",
    "awaiting_approval"
  ),
  OUTLINE_APPROVED: createState("outline_generation", "approved"),
  OUTLINE_REJECTED: createState("outline_generation", "rejected"),
  OUTLINE_FAILED: createState("outline_generation", "failed"),

  DRAFT_GENERATING: createState("draft_generation", "in_progress"),
  DRAFT_GENERATED: createState("draft_generation", "completed"),
  DRAFT_FAILED: createState("draft_generation", "failed"),

  COMPLETED: createState("completed", "completed"),
} as const;
