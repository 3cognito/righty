import type { IArticle } from "../types/article_data.js";
import { StageStatus, WorkflowStage, WorkflowState } from "./state.js";

export interface ResearchResult {
  query?: string;
  results: {
    url: string;
    text: string;
  }[];
}

export interface ResearchResultSummary {
  query?: string;
  summary: {
    url: string;
    text: string;
  }[];
}

export interface StageOutputs {
  outline?: {
    content: string;
    approvedAt?: Date;
    rejectionReason?: string;
  };
  researchQueries?: {
    queries: string[];
    approvedAt?: Date;
    rejectionReason?: string;
  };
  researchResults?: {
    results: ResearchResult[];
  };
  researchSummary?: {
    summaries: ResearchResultSummary[];
  };
  draft?: {
    content: string;
    approvedAt?: Date;
    rejectionReason?: string;
  };
  claimVerification?: {
    content: string;
  };
  internalLinks?: {
    content: string;
  };
}

export interface StageExecutionMetric {
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  tokensUsed?: number;
  error?: {
    message: string;
    stack?: string;
  };
  retryCount: number;
}

export interface ArticleGenerationContextData {
  id: string;
  createdAt: string;
  updatedAt: string;
  input: IArticle;
  state: WorkflowState;
  outputs: StageOutputs;
  stageExecutionMetrics: Partial<Record<WorkflowStage, StageExecutionMetric>>;
  history: Array<{
    timestamp: string;
    state: WorkflowState;
    action: string;
  }>;
}

export class ArticleGenerationContext {
  private data: ArticleGenerationContextData;
  private currentExecution?: { stage: WorkflowStage; startTime: number };

  constructor(input: IArticle) {
    const now = new Date().toISOString();
    const initialState = WorkflowState.initial();

    this.data = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      state: initialState,
      input,
      outputs: {},
      stageExecutionMetrics: {},
      history: [
        {
          timestamp: now,
          state: initialState,
          action: "Workflow initialized",
        },
      ],
    };
  }

  transitionTo(newState: WorkflowState, action: string): void {
    if (!this.data.state.canTransitionTo(newState)) {
      throw new Error(
        `Invalid transition from ${this.data.state.getDescription()} to ${newState.getDescription()}`
      );
    }

    const now = new Date().toISOString();
    this.data.state = newState;
    this.data.updatedAt = now;
    this.data.history.push({ timestamp: now, state: newState, action });

    console.log(`[${this.data.id}] ${newState.getDescription()}: ${action}`);
  }

  startStage(stage: WorkflowStage): void {
    if (this.currentExecution) {
      throw new Error(
        `Cannot start stage ${stage}: stage ${this.currentExecution.stage} is still running`
      );
    }

    const now = new Date().toISOString();
    this.currentExecution = { stage, startTime: Date.now() };

    this.data.stageExecutionMetrics[stage] = {
      startedAt: now,
      retryCount: this.data.stageExecutionMetrics[stage]?.retryCount ?? 0,
    };
    this.data.updatedAt = now;
  }

  completeStage(tokensUsed?: number): void {
    if (!this.currentExecution) {
      throw new Error("No stage is currently running");
    }

    const { stage, startTime } = this.currentExecution;
    const now = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    this.data.stageExecutionMetrics[stage] = {
      ...this.data.stageExecutionMetrics[stage]!,
      completedAt: now,
      durationMs,
      ...(tokensUsed !== undefined && { tokensUsed }),
    };
    this.data.updatedAt = now;
    this.currentExecution = undefined;
  }

  failStage(error: Error): void {
    if (!this.currentExecution) {
      throw new Error("No stage is currently running");
    }

    const { stage, startTime } = this.currentExecution;
    const now = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    this.data.stageExecutionMetrics[stage] = {
      ...this.data.stageExecutionMetrics[stage]!,
      completedAt: now,
      durationMs,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };
    this.data.updatedAt = now;
    this.currentExecution = undefined;
  }

  setOutline(content: string): void {
    this.data.outputs.outline = { content };
    this.data.updatedAt = new Date().toISOString();
  }

  approveOutline(): void {
    if (!this.data.outputs.outline) {
      throw new Error("No outline to approve");
    }
    this.data.outputs.outline.approvedAt = new Date();
    this.transitionTo(this.data.state.withStatus(StageStatus.COMPLETED), "Outline approved");
  }

  rejectOutline(reason: string): void {
    if (!this.data.outputs.outline) {
      throw new Error("No outline to reject");
    }
    this.data.outputs.outline.rejectionReason = reason;
    this.transitionTo(
      this.data.state.withStatus(StageStatus.REJECTED),
      `Outline rejected: ${reason}`
    );
  }

  getOutline(): string | undefined {
    return this.data.outputs.outline?.content;
  }

  setResearchQueries(queries: string[]): void {
    this.data.outputs.researchQueries = { queries };
    this.data.updatedAt = new Date().toISOString();
  }

  approveResearchQueries(): void {
    if (!this.data.outputs.researchQueries) {
      throw new Error("No research queries to approve");
    }
    this.data.outputs.researchQueries.approvedAt = new Date();
    this.transitionTo(
      this.data.state.withStatus(StageStatus.COMPLETED),
      "Research queries approved"
    );
  }

  rejectResearchQueries(reason: string): void {
    if (!this.data.outputs.researchQueries) {
      throw new Error("No research queries to reject");
    }
    this.data.outputs.researchQueries.rejectionReason = reason;
    this.transitionTo(
      this.data.state.withStatus(StageStatus.REJECTED),
      `Research queries rejected: ${reason}`
    );
  }

  getResearchQueries(): string[] | undefined {
    return this.data.outputs.researchQueries?.queries;
  }

  setResearchResults(results: ResearchResult[]): void {
    this.data.outputs.researchResults = { results };
    this.data.updatedAt = new Date().toISOString();
  }

  getResearchResults(): ResearchResult[] | undefined {
    return this.data.outputs.researchResults?.results;
  }

  setResearchSummary(summaries: ResearchResultSummary[]): void {
    this.data.outputs.researchSummary = { summaries };
    this.data.updatedAt = new Date().toISOString();
  }

  getResearchSummary(): ResearchResultSummary[] | undefined {
    return this.data.outputs.researchSummary?.summaries;
  }

  setDraft(content: string): void {
    this.data.outputs.draft = { content };
    this.data.updatedAt = new Date().toISOString();
  }

  approveDraft(): void {
    if (!this.data.outputs.draft) {
      throw new Error("No draft to approve");
    }
    this.data.outputs.draft.approvedAt = new Date();
    this.transitionTo(this.data.state.withStatus(StageStatus.COMPLETED), "Draft approved");
  }

  rejectDraft(reason: string): void {
    if (!this.data.outputs.draft) {
      throw new Error("No draft to reject");
    }
    this.data.outputs.draft.rejectionReason = reason;
    this.transitionTo(
      this.data.state.withStatus(StageStatus.REJECTED),
      `Draft rejected: ${reason}`
    );
  }

  getDraft(): string | undefined {
    return this.data.outputs.draft?.content;
  }

  setClaimVerification(content: string): void {
    this.data.outputs.claimVerification = { content };
    this.data.updatedAt = new Date().toISOString();
  }

  getClaimVerification(): string | undefined {
    return this.data.outputs.claimVerification?.content;
  }

  setInternalLinks(content: string): void {
    this.data.outputs.internalLinks = { content };
    this.data.updatedAt = new Date().toISOString();
  }

  getInternalLinks(): string | undefined {
    return this.data.outputs.internalLinks?.content;
  }

  getId(): string {
    return this.data.id;
  }

  getState(): WorkflowState {
    return this.data.state;
  }

  getCurrentStage(): WorkflowStage {
    return this.data.state.stage;
  }

  isCurrentStageComplete(): boolean {
    return this.data.state.isComplete();
  }

  hasCurrentStageFailed(): boolean {
    return this.data.state.isFailed();
  }

  getInput(): IArticle {
    return this.data.input;
  }

  getStageExecutionMetrics(stage: WorkflowStage): StageExecutionMetric | undefined {
    return this.data.stageExecutionMetrics[stage];
  }

  getSummary(): string {
    const created = new Date(this.data.createdAt);
    const updated = new Date(this.data.updatedAt);
    const durationMs = updated.getTime() - created.getTime();
    const durationSec = (durationMs / 1000).toFixed(2);

    const stagesSummary = Object.entries(this.data.stageExecutionMetrics)
      .map(([stage, execMetric]) => {
        const status = execMetric.error ? "FAILED" : "OK";
        const duration = execMetric.durationMs ? (execMetric.durationMs / 1000).toFixed(2) : "N/A";
        return `  - ${stage}: ${status} (${duration}s)${
          execMetric.retryCount > 0 ? ` [${execMetric.retryCount} retries]` : ""
        }`;
      })
      .join("\n");

    const errorCount = Object.values(this.data.stageExecutionMetrics).filter((e) => e.error).length;

    return `
Pipeline Summary:
  ID: ${this.data.id}
  Final State: ${this.data.state.getDescription()}
  Total Duration: ${durationSec}s
  Research Queries: ${this.data.outputs.researchQueries?.queries.length ?? 0}
  Research Results: ${this.data.outputs.researchResults?.results.length ?? 0}
  Errors: ${errorCount}

Stage Results:
${stagesSummary || "  (none)"}
`.trim();
  }

  toJSON(): ArticleGenerationContextData {
    return {
      ...structuredClone(this.data),
      state: this.data.state.toJSON() as WorkflowState,
    };
  }

  static fromJSON(data: ArticleGenerationContextData): ArticleGenerationContext {
    const ctx = Object.create(ArticleGenerationContext.prototype);
    ctx.data = {
      ...data,
      state: WorkflowState.fromJSON(data.state.toJSON()),
      history: data.history.map((h) => ({
        ...h,
        state: WorkflowState.fromJSON(h.state.toJSON()),
      })),
    };
    ctx.currentExecution = undefined;
    return ctx;
  }
}
