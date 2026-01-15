import type { ArticleInput } from "../schemas/article_input.schema.js";
import {
  getStateDescription,
  isStageComplete,
  isStageFailed,
  STATES,
  type WorkflowStage,
  type WorkflowState,
} from "./state.js";

export interface ResearchResult {
  url: string;
  text: string;
}

interface StageResult {
  success: boolean;
  timestamp: string;
  durationMs: number;
  error?: string;
  tokensUsed?: number;
}

export interface ArticleGenerationContextData {
  id: string;
  state: WorkflowState;
  input: ArticleInput;

  researchQueries?: string[];
  researchResults?: ResearchResult[];
  outline?: string;
  draft?: string;

  stageResults: {
    researchQueryGeneration?: StageResult;
    researchExecution?: StageResult;
    outlineGeneration?: StageResult;
    draftGeneration?: StageResult;
  };

  approvals: {
    researchQueries?: Date;
    outline?: Date;
  };

  metadata: {
    createdAt: string;
    updatedAt: string;
    requiresApproval: {
      researchQueries: boolean;
      outline: boolean;
    };
  };

  history: Array<{
    timestamp: string;
    state: WorkflowState;
    action: string;
  }>;

  errors: Array<{
    timestamp: string;
    stage: WorkflowStage;
    error: string;
    stack?: string;
  }>;
}

export class ArticleGenerationContext {
  private data: ArticleGenerationContextData;

  constructor(
    input: ArticleInput,
    config?: {
      requiresApproval?: {
        researchQueries?: boolean;
        outline?: boolean;
      };
    }
  ) {
    const now = new Date().toISOString();

    this.data = {
      id: crypto.randomUUID(),
      state: STATES.INITIALIZED,
      input,
      stageResults: {},
      approvals: {},
      metadata: {
        createdAt: now,
        updatedAt: now,
        requiresApproval: {
          researchQueries: config?.requiresApproval?.researchQueries ?? false,
          outline: config?.requiresApproval?.outline ?? true,
        },
      },
      history: [
        {
          timestamp: now,
          state: STATES.INITIALIZED,
          action: "Context initialized",
        },
      ],
      errors: [],
    };
  }

  transitionTo(newState: WorkflowState, action: string): void {
    const now = new Date().toISOString();

    this.data.state = newState;
    this.data.metadata.updatedAt = now;
    this.data.history.push({
      timestamp: now,
      state: newState,
      action,
    });

    const description = getStateDescription(newState);
    console.log(`[${this.data.id}] ${description}: ${action}`);
  }

  getState(): WorkflowState {
    return this.data.state;
  }

  getId(): string {
    return this.data.id;
  }

  isInStage(stage: string) {
    this.data.state.stage == stage;
  }

  isCurrentStageComplete(): boolean {
    return isStageComplete(this.data.state);
  }

  hasCurrentStageFailed(): boolean {
    return isStageFailed(this.data.state);
  }

  setResearchQueries(queries: string[]): void {
    this.data.researchQueries = queries;
    this.data.metadata.updatedAt = new Date().toISOString();
  }

  setResearchResults(results: ResearchResult[]): void {
    this.data.researchResults = results;
    this.data.metadata.updatedAt = new Date().toISOString();
  }

  setOutline(outline: string): void {
    this.data.outline = outline;
    this.data.metadata.updatedAt = new Date().toISOString();
  }

  setDraft(draft: string): void {
    this.data.draft = draft;
    this.data.metadata.updatedAt = new Date().toISOString();
  }

  setResearchQueryApproval(): void {
    this.data.approvals.researchQueries = new Date();
    this.data.metadata.updatedAt = new Date().toISOString();
  }

  setOutlineApproval(): void {
    this.data.approvals.outline = new Date();
    this.data.metadata.updatedAt = new Date().toISOString();
  }

  isResearchQueryApprovalRequired(): boolean {
    return this.data.metadata.requiresApproval.researchQueries;
  }

  isOutlineApprovalRequired(): boolean {
    return this.data.metadata.requiresApproval.outline;
  }

  getInput(): ArticleInput {
    return this.data.input;
  }

  getResearchQueries(): string[] | undefined {
    return this.data.researchQueries;
  }

  getResearchResults(): ResearchResult[] | undefined {
    return this.data.researchResults;
  }

  getOutline(): string | undefined {
    return this.data.outline;
  }

  startStage(
    stage: keyof ArticleGenerationContextData["stageResults"]
  ): number {
    return Date.now();
  }

  completeStage(
    stage: keyof ArticleGenerationContextData["stageResults"],
    startTime: number,
    tokensUsed?: number
  ): void {
    const now = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    const result: StageResult = {
      success: true,
      timestamp: now,
      durationMs,
    };

    if (tokensUsed !== undefined) {
      result.tokensUsed = tokensUsed;
    }

    this.data.stageResults[stage] = result;
    this.data.metadata.updatedAt = now;
  }

  failStage(
    stage: keyof ArticleGenerationContextData["stageResults"],
    startTime: number,
    error: Error
  ): void {
    const now = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    this.data.stageResults[stage] = {
      success: false,
      timestamp: now,
      durationMs,
      error: error.message,
    };
    this.data.metadata.updatedAt = now;

    this.recordError(
      stage.replace(/([A-Z])/g, "_$1").toLowerCase() as WorkflowStage,
      error
    );
  }

  recordError(stage: WorkflowStage, error: Error): void {
    const errorEntry: {
      timestamp: string;
      stage: WorkflowStage;
      error: string;
      stack?: string;
    } = {
      timestamp: new Date().toISOString(),
      stage,
      error: error.message,
    };

    if (error.stack) {
      errorEntry.stack = error.stack;
    }

    this.data.errors.push(errorEntry);
  }

  getSummary(): string {
    const created = new Date(this.data.metadata.createdAt);
    const updated = new Date(this.data.metadata.updatedAt);
    const durationMs = updated.getTime() - created.getTime();
    const durationSec = (durationMs / 1000).toFixed(2);

    const stagesSummary = Object.entries(this.data.stageResults)
      .map(([stage, result]) => {
        const status = result.success ? "OK" : "FAILED";
        const duration = (result.durationMs / 1000).toFixed(2);
        return `  - ${stage}: ${status} (${duration}s)`;
      })
      .join("\n");

    return `
Pipeline Summary:
  ID: ${this.data.id}
  Final State: ${getStateDescription(this.data.state)}
  Total Duration: ${durationSec}s
  Research Queries: ${this.data.researchQueries?.length ?? 0}
  Research Results: ${this.data.researchResults?.length ?? 0}
  Errors: ${this.data.errors.length}

Stage Results:
${stagesSummary || "  (none)"}
`.trim();
  }

  toJSON(): ArticleGenerationContextData {
    return { ...this.data };
  }
}
