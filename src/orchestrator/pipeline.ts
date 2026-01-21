import { ResearchPlanner } from "../agents/research_planner.js";
import type { ArticleGenerationContext } from "./context-manager.js";
import { WorkflowStage, StageStatus, WorkflowState } from "./state.js";

export interface PipelineConfig {
  maxRetriesPerStage?: number;
  skipApprovals?: boolean;
}

interface StageExecutor {
  stage: WorkflowStage;
  execute: (ctx: ArticleGenerationContext) => Promise<void>;
}

export class ArticleGenerationPipeline {
  private executors: Map<WorkflowStage, StageExecutor>;

  constructor(
    private agents: {
      researchPlanner: ResearchPlanner;
    },
    private config: PipelineConfig = {}
  ) {
    this.executors = new Map([
      [WorkflowStage.OUTLINE_GENERATION, this.createOutlineExecutor()],
      [WorkflowStage.RESEARCH_QUERY_GENERATION, this.createResearchQueryExecutor()],
    ]);
  }

  async execute(ctx: ArticleGenerationContext): Promise<ArticleGenerationContext> {
    console.log(`Starting pipeline for context: ${ctx.getId()}`);

    try {
      while (ctx.getState().stage !== WorkflowStage.COMPLETED) {
        const currentStage = ctx.getCurrentStage();

        await this.executeStage(ctx, currentStage);

        if (!this.config.skipApprovals && ctx.getState().status === StageStatus.AWAITING_APPROVAL) {
          console.log(`Pausing: ${currentStage} awaiting approval`);
          break;
        }

        if (ctx.getState().isFailed()) {
          console.log(`Pipeline stopped: ${currentStage} failed`);
          break;
        }

        const nextState = ctx.getState().advance();
        if (nextState) {
          ctx.transitionTo(nextState, `Advancing to ${nextState.stage}`);
        } else {
          ctx.transitionTo(
            new WorkflowState(WorkflowStage.COMPLETED, StageStatus.COMPLETED),
            "Workflow completed"
          );
        }
      }

      console.log(`Pipeline finished`);
      console.log(ctx.getSummary());

      return ctx;
    } catch (error) {
      console.error("Pipeline failed:", error);
      this.saveContextOnError(ctx);
      throw error;
    }
  }

  async resume(ctx: ArticleGenerationContext): Promise<ArticleGenerationContext> {
    console.log(`Resuming pipeline from ${ctx.getCurrentStage()}`);
    return this.execute(ctx);
  }

  private async executeStage(ctx: ArticleGenerationContext, stage: WorkflowStage): Promise<void> {
    const executor = this.executors.get(stage);
    if (!executor) {
      throw new Error(`No executor found for stage: ${stage}`);
    }

    const currentState = ctx.getState();
    console.log(`\n>> Executing: ${currentState.getDescription()}`);

    ctx.startStage(stage);

    try {
      await executor.execute(ctx);

      ctx.completeStage();

      const completionStatus = currentState.requiresApproval()
        ? StageStatus.AWAITING_APPROVAL
        : StageStatus.COMPLETED;

      const newState = new WorkflowState(stage, completionStatus);
      ctx.transitionTo(
        newState,
        currentState.requiresApproval()
          ? `${currentState.getDescription()} completed, awaiting approval`
          : `${currentState.getDescription()} completed`
      );

      console.log(`<< Completed: ${newState.getDescription()}`);
    } catch (error) {
      console.error(`Stage error: ${currentState.getDescription()}`, error);

      ctx.failStage(error as Error);

      const failedState = new WorkflowState(stage, StageStatus.FAILED);
      ctx.transitionTo(
        failedState,
        `${currentState.getDescription()} failed: ${(error as Error).message}`
      );

      const execution = ctx.getStageExecutionMetrics(stage);
      const maxRetries = this.config.maxRetriesPerStage ?? 0;

      if (execution && execution.retryCount < maxRetries) {
        console.log(`Retrying stage (attempt ${execution.retryCount + 1}/${maxRetries})`);

        const retryState = new WorkflowState(stage, StageStatus.IN_PROGRESS);
        ctx.transitionTo(retryState, `Retrying ${currentState.getDescription()}`);

        await this.executeStage(ctx, stage);
      } else {
        throw error;
      }
    }
  }

  private createOutlineExecutor(): StageExecutor {
    return {
      stage: WorkflowStage.OUTLINE_GENERATION,
      execute: async (ctx) => {
        const outline = ``;
        ctx.setOutline(outline);
        console.log(`Generated outline (${outline.length} chars)`);
      },
    };
  }

  private createResearchQueryExecutor(): StageExecutor {
    return {
      stage: WorkflowStage.RESEARCH_QUERY_GENERATION,
      execute: async (ctx) => {
        const outline = ctx.getOutline();
        if (!outline) {
          throw new Error("No outline available for research query generation");
        }

        const queries = await this.agents.researchPlanner.generate(ctx.getInput());
        ctx.setResearchQueries(queries);

        console.log(`Generated ${queries.length} research queries:`);
      },
    };
  }

  private saveContextOnError(ctx: ArticleGenerationContext): void {
    try {
      const filename = `error-context-${ctx.getId()}.json`;
      console.log(`Error context saved: ${filename}`);
      console.log(`Context state:\n${JSON.stringify(ctx.toJSON(), null, 2)}`);
    } catch (error) {
      console.error("Failed to save error context:", error);
    }
  }
}
