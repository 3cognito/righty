# Righty: Agentic Content Generation Workflow

This is going to be automated workflow for generating marketing content through a coordinated multi-agent system. The system generates article outlines, conducts research, drafts content, and validates claims—all orchestrated through a state management pipeline.

## Tech Stack

- **Local LLM**: Open ended decision based on your hardware.
- **Frontier Models**: Claude API
- **Search**: SERP API (Likely)
- **Language**: TypeScript
- **Runtime**: Node.js (May switch to bun)

## Project Status

In Development

## Input Parameters

- General guidelines
- Client-specific guidelines
- Article name
- Client name
- Example article
- Additional prompts (Describing structure and any other important detail by the author)

## Workflow Pipeline

### 1. Outline Generation (Local LLM)

Generates a proposed article outline based on the input parameters and initial prompt.

### 2. Research Planning (Local llm)

Analyzes the generated outline and creates a structured list of research queries needed to support the article content.

### 3. Research Execution (Search API + Local LLM)

Executes the planned queries using the search API and summarizes findings with the local LLM, organizing results by relevance to the article topic.

### 4. Draft Generation (Frontier Model)

Creates the initial article draft using Claude or another frontier model, using the research findings and guidelines.

### 5. Claim Verification (Local LLM + Programmatic checks)

Extracts claims from the draft and validates them against the research summary. Claims without supporting evidence are either flagged for user review or trigger additional searches to verify them. This step will also carry out some programmatic checks and aggregate findings.

### 6. Internal Linking (Local LLM)

Fetches available internal links from the client repository and automatically applies relevant internal links to the draft, with options for user review and suggestions.

## Orchestration & State Management

A centralized orchestrator manages the workflow pipeline using a context object that tracks:

- **State transitions**: Coordinates movement between pipeline steps
- **State data**: Maintains data artifacts from each step (outline, research, draft, etc.)
- **Sequential execution**: Steps execute in order with data passed between stages

### Current Architecture

- Sequential step execution with state handoff between stages
- Context object manages all state and transition logic

### Future Enhancements

- **Batch processing**: Generate multiple articles simultaneously in a coordinated manner
- **State persistence**: Save workflow state to enable restarts without losing progress
- **Rollback capability**: Revert to previous pipeline states if needed (Highly unlikely that I will want this)
- **Human in the loop**: Add a human in the loop to  interfere during steps (accept reject current state? Will add more details to this soon)

## Quick Start

Will add setup guidelines soon alongside sample data

## Open Questions

- Should claim verification trigger expensive external searches, or flag unverified claims for user review?
- Should validation checks be a separate step or combined with a checklist-based verification pass?
- What specific validation metrics should be checked (e.g., length, keyword density, etc.)?

---

_This is in active development. Check back for updates on implementation status and additional features._
