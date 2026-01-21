// import { writeFileSync } from "fs";
// import { join } from "path";
// import { ResearchAgent } from "./agents/research-agent.js";
// import { ResearchPlanner } from "./agents/research_planner.js";
// import { ArticleGenerationContext } from "./orchestrator/context-manager.js";
// import { ArticleGenerationPipeline } from "./orchestrator/pipeline.js";
// import type { EndpointPayload } from "./schemas/article_input.schema.js";
// import { OllamaService } from "./services/ollama.service.js";
// import { SerpService } from "./services/serp.service.js";

// export const testInput: EndpointPayload = {
//   title: "5 Essential Tips for Better Sleep",
//   clientName: "HealthWellness Blog",
//   usps: "Science-backed advice, practical tips, suitable for all ages",
//   minWordCount: 1000,
//   maxWordCount: 2000,
//   clientGuidelines:
//     "Friendly and approachable tone, use simple language, include actionable advice",
//   generalGuidelines:
//     "Use short paragraphs, include subheadings, make it scannable",
//   exampleArticle: `
//     Getting enough quality sleep is crucial for your health and wellbeing.
//     In this article, we'll explore practical steps you can take tonight.

//     Why Sleep Matters
//     Sleep affects everything from your mood to your immune system. Studies show that adults need 7-9 hours per night.

//     Our Top Tips
//     First, establish a consistent bedtime routine. Your body loves predictability.
//   `,
//   outlineDescription:
//     "Introduction, 5 main tip sections (one per tip), brief conclusion",
// };

// async function testResearchPipeline() {
//   console.log("Testing Research Pipeline...\n");
//   console.log("Input:", JSON.stringify(testInput, null, 2));

//   // Initialize services
//   const llmService = new OllamaService();
//   const serpService = new SerpService();

//   // Initialize agents
//   const researchPlanner = new ResearchPlanner(llmService);
//   const researchAgent = new ResearchAgent(serpService);

//   // Create pipeline
//   const pipeline = new ArticleGenerationPipeline(
//     researchPlanner,
//     researchAgent,
//     { skipResearch: false }
//   );

//   // Create context
//   const context = new ArticleGenerationContext(testInput, {
//     requiresApproval: {
//       researchQueries: false,
//       outline: false,
//     },
//   });

//   try {
//     // Execute pipeline
//     const result = await pipeline.execute(context);

//     // Save results
//     const timestamp = new Date()
//       .toISOString()
//       .replace(/:/g, "-")
//       .replace(/\..+/, "")
//       .replace("T", "_");

//     const outputDir = process.cwd();

//     // Save research queries
//     const queries = result.getResearchQueries();
//     if (queries && queries.length > 0) {
//       const queriesFile = join(outputDir, `${timestamp}_queries.txt`);
//       writeFileSync(queriesFile, queries.join("\n"), "utf-8");
//       console.log(`\nSaved queries to: ${queriesFile}`);
//     }

//     // Save research results
//     const researchResults = result.getResearchResults();
//     if (researchResults && researchResults.length > 0) {
//       const resultsFile = join(outputDir, `${timestamp}_research.json`);
//       writeFileSync(
//         resultsFile,
//         JSON.stringify(researchResults, null, 2),
//         "utf-8"
//       );
//       console.log(`Saved research results to: ${resultsFile}`);
//     }

//     // Save full context
//     const contextFile = join(outputDir, `${timestamp}_context.json`);
//     writeFileSync(contextFile, JSON.stringify(result.toJSON(), null, 2), "utf-8");
//     console.log(`Saved full context to: ${contextFile}`);

//     console.log("\nPipeline completed successfully!");
//   } catch (error) {
//     console.error("\nPipeline failed:", error);
//     process.exit(1);
//   }
// }

// testResearchPipeline();
