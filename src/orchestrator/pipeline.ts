import { ResearchAgent } from "../agents/research-agent.js";
import { ResearchPlanner } from "../agents/research_planner.js";
import type { ArticleGenerationContext } from "./context-manager.js";
import { STATES } from "./state.js";

export interface PipelineConfig {
  skipResearch?: boolean;
  maxRetries?: number;
}

interface PipelineStage {
  name: string;
  execute: (ctx: ArticleGenerationContext) => Promise<void>;
  shouldExecute?: (ctx: ArticleGenerationContext) => boolean;
  onError?: (ctx: ArticleGenerationContext, error: Error) => Promise<void>;
}

export class ArticleGenerationPipeline {
  private stages: PipelineStage[];

  constructor(
    private researchPlanner: ResearchPlanner,
    private researchAgent: ResearchAgent,
    private config: PipelineConfig = {}
  ) {
    this.stages = [
      {
        name: "research_query_generation",
        execute: (ctx) => this.executeResearchQueryGeneration(ctx),
        shouldExecute: () => !this.config.skipResearch,
      },
      {
        name: "research_execution",
        execute: (ctx) => this.executeResearch(ctx),
        shouldExecute: (ctx) =>
          !this.config.skipResearch &&
          ctx.getResearchQueries() !== undefined &&
          ctx.getResearchQueries()!.length > 0,
      },
    ];
  }

  async execute(
    ctx: ArticleGenerationContext
  ): Promise<ArticleGenerationContext> {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Starting pipeline for context: ${ctx.getId()}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      for (const stage of this.stages) {
        if (stage.shouldExecute && !stage.shouldExecute(ctx)) {
          console.log(`Skipping stage: ${stage.name}`);
          continue;
        }

        console.log(`\n>> Executing stage: ${stage.name}`);

        try {
          await stage.execute(ctx);

          if (ctx.hasCurrentStageFailed()) {
            console.log(`Stage failed: ${stage.name}`);

            if (stage.onError) {
              await stage.onError(ctx, new Error(`Stage ${stage.name} failed`));
            }

            break;
          }

          console.log(`<< Stage completed: ${stage.name}`);
        } catch (error) {
          console.error(`Stage error: ${stage.name}`, error);

          if (stage.onError) {
            await stage.onError(ctx, error as Error);
          }

          throw error;
        }
      }

      if (
        ctx.getState().stage === "research_execution" &&
        ctx.isCurrentStageComplete()
      ) {
        ctx.transitionTo(
          STATES.RESEARCH_COMPLETED,
          "Research pipeline completed successfully"
        );
      }

      console.log(`\n${"=".repeat(60)}`);
      console.log(`Pipeline finished`);
      console.log(ctx.getSummary());
      console.log(`${"=".repeat(60)}\n`);

      return ctx;
    } catch (error) {
      console.error("\nPipeline failed:", error);

      this.saveContextOnError(ctx);

      throw error;
    }
  }

  private async executeResearchQueryGeneration(
    ctx: ArticleGenerationContext
  ): Promise<void> {
    ctx.transitionTo(
      STATES.RESEARCH_QUERY_GENERATING,
      "Starting research query generation"
    );

    const startTime = ctx.startStage("researchQueryGeneration");

    try {
      const queries = await this.researchPlanner.generate(ctx.getInput());

      ctx.setResearchQueries(queries);

      ctx.completeStage("researchQueryGeneration", startTime);

      console.log(`Generated ${queries.length} research queries:`);
      queries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));

      if (ctx.isResearchQueryApprovalRequired()) {
        ctx.transitionTo(
          STATES.RESEARCH_QUERY_AWAITING_APPROVAL,
          `Generated ${queries.length} research queries, awaiting approval`
        );
      } else {
        ctx.transitionTo(
          STATES.RESEARCH_QUERY_GENERATED,
          `Generated ${queries.length} research queries`
        );
      }
    } catch (error) {
      ctx.failStage("researchQueryGeneration", startTime, error as Error);
      ctx.transitionTo(
        STATES.RESEARCH_QUERY_FAILED,
        "Research query generation failed"
      );
      throw error;
    }
  }

  private async executeResearch(ctx: ArticleGenerationContext): Promise<void> {
    const queries = ctx.getResearchQueries();
    if (!queries || queries.length === 0) {
      throw new Error("No research queries available");
    }

    ctx.transitionTo(
      STATES.RESEARCH_STARTED,
      `Starting research for ${queries.length} queries`
    );

    const startTime = ctx.startStage("researchExecution");

    try {
      const results = await this.researchAgent.execute(queries);

      ctx.setResearchResults(results);
      ctx.completeStage("researchExecution", startTime);

      console.log(`\nResearch results (${results.length} total):`);
      results.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.url}`);
      });
      if (results.length > 5) {
        console.log(`  ... and ${results.length - 5} more`);
      }

      ctx.transitionTo(
        STATES.RESEARCH_COMPLETED,
        `Research completed with ${results.length} results`
      );
    } catch (error) {
      ctx.failStage("researchExecution", startTime, error as Error);
      ctx.transitionTo(STATES.RESEARCH_FAILED, "Research execution failed");
      throw error;
    }
  }

  private saveContextOnError(ctx: ArticleGenerationContext): void {
    try {
      const filename = `error-context-${ctx.getId()}.json`;
      console.log(`Error context ID: ${ctx.getId()}`);
      console.log(`To debug, check context state: ${JSON.stringify(ctx.toJSON(), null, 2)}`);
    } catch (error) {
      console.error("Failed to save error context:", error);
    }
  }
}
