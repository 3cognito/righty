export enum WorkflowStage {
  OUTLINE_GENERATION = "outline_generation",
  RESEARCH_QUERY_GENERATION = "research_query_generation",
  RESEARCH_EXECUTION = "research_execution",
  RESEARCH_SUMMARIZATION = "research_summarization",
  DRAFT_GENERATION = "draft_generation",
  VERIFICATION = "verification",
  INTERNAL_LINKING = "internal_linking",
  COMPLETED = "completed",
}

export enum StageStatus {
  IN_PROGRESS = "in_progress",
  AWAITING_APPROVAL = "awaiting_approval",
  REJECTED = "rejected",
  COMPLETED = "completed",
  FAILED = "failed",
}

interface StageMetadata {
  name: string;
  requiresApproval: boolean;
  allowedStatuses: StageStatus[];
  nextStage: WorkflowStage | null;
}

const STAGE_METADATA: Record<WorkflowStage, StageMetadata> = {
  [WorkflowStage.OUTLINE_GENERATION]: {
    name: "Outline Generation",
    requiresApproval: true,
    allowedStatuses: [
      StageStatus.AWAITING_APPROVAL,
      StageStatus.COMPLETED,
      StageStatus.REJECTED,
      StageStatus.FAILED,
    ],
    nextStage: WorkflowStage.RESEARCH_QUERY_GENERATION,
  },
  [WorkflowStage.RESEARCH_QUERY_GENERATION]: {
    name: "Research Query Generation",
    requiresApproval: true,
    allowedStatuses: [
      StageStatus.AWAITING_APPROVAL,
      StageStatus.COMPLETED,
      StageStatus.REJECTED,
      StageStatus.FAILED,
    ],
    nextStage: WorkflowStage.RESEARCH_EXECUTION,
  },
  [WorkflowStage.RESEARCH_EXECUTION]: {
    name: "Research Execution",
    requiresApproval: false,
    allowedStatuses: [StageStatus.COMPLETED, StageStatus.FAILED],
    nextStage: WorkflowStage.RESEARCH_SUMMARIZATION,
  },
  [WorkflowStage.RESEARCH_SUMMARIZATION]: {
    name: "Research Summarization",
    requiresApproval: false,
    allowedStatuses: [StageStatus.COMPLETED, StageStatus.FAILED],
    nextStage: WorkflowStage.DRAFT_GENERATION,
  },
  [WorkflowStage.DRAFT_GENERATION]: {
    name: "Draft Generation",
    requiresApproval: true,
    allowedStatuses: [
      StageStatus.AWAITING_APPROVAL,
      StageStatus.COMPLETED,
      StageStatus.REJECTED,
      StageStatus.FAILED,
    ],
    nextStage: WorkflowStage.VERIFICATION,
  },
  [WorkflowStage.VERIFICATION]: {
    name: "Claim Verification",
    requiresApproval: false,
    allowedStatuses: [StageStatus.COMPLETED, StageStatus.FAILED],
    nextStage: WorkflowStage.INTERNAL_LINKING,
  },
  [WorkflowStage.INTERNAL_LINKING]: {
    name: "Internal Linking",
    requiresApproval: false,
    allowedStatuses: [StageStatus.COMPLETED, StageStatus.FAILED],
    nextStage: WorkflowStage.COMPLETED,
  },
  [WorkflowStage.COMPLETED]: {
    name: "Completed",
    requiresApproval: false,
    allowedStatuses: [StageStatus.COMPLETED],
    nextStage: null,
  },
};

export class WorkflowState {
  constructor(public readonly stage: WorkflowStage, public readonly status: StageStatus) {
    if (!this.isValid()) {
      throw new Error(`Invalid state: ${stage} cannot have status ${status}`);
    }
  }

  static initial(): WorkflowState {
    return new WorkflowState(WorkflowStage.OUTLINE_GENERATION, StageStatus.IN_PROGRESS);
  }

  private getMetadata(): StageMetadata {
    return STAGE_METADATA[this.stage];
  }

  isValid(): boolean {
    return this.getMetadata().allowedStatuses.includes(this.status);
  }

  isInStage(stage: WorkflowStage): boolean {
    return this.stage === stage;
  }

  isComplete(): boolean {
    return this.status === StageStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === StageStatus.FAILED || this.status === StageStatus.REJECTED;
  }

  requiresApproval(): boolean {
    return this.getMetadata().requiresApproval;
  }

  getNextStage(): WorkflowStage | null {
    return this.getMetadata().nextStage;
  }

  canTransitionTo(newState: WorkflowState): boolean {
    if (!newState.isValid()) {
      return false;
    }

    const stageOrder = Object.values(WorkflowStage);
    const fromIndex = stageOrder.indexOf(this.stage);
    const toIndex = stageOrder.indexOf(newState.stage);

    if (toIndex < fromIndex) {
      return false;
    }

    if (this.stage === newState.stage) {
      return this.isValidSameStageTransition(newState.status);
    }

    if (newState.stage === this.getNextStage()) {
      return this.isComplete();
    }

    return false;
  }

  private isValidSameStageTransition(toStatus: StageStatus): boolean {
    const transitions: Record<StageStatus, StageStatus[]> = {
      [StageStatus.IN_PROGRESS]: Object.values(StageStatus),
      [StageStatus.AWAITING_APPROVAL]: [StageStatus.COMPLETED, StageStatus.REJECTED],
      [StageStatus.REJECTED]: [StageStatus.IN_PROGRESS],
      [StageStatus.FAILED]: [StageStatus.IN_PROGRESS],
      [StageStatus.COMPLETED]: [],
    };
    return transitions[this.status]?.includes(toStatus) ?? false;
  }

  transitionTo(newStage: WorkflowStage, newStatus: StageStatus): WorkflowState {
    const newState = new WorkflowState(newStage, newStatus);

    if (!this.canTransitionTo(newState)) {
      throw new Error(
        `Invalid transition from ${this.getDescription()} to ${newState.getDescription()}`
      );
    }

    return newState;
  }

  advance(): WorkflowState | null {
    if (!this.isComplete()) {
      return null;
    }

    const nextStage = this.getNextStage();
    if (!nextStage) {
      return null;
    }

    return new WorkflowState(nextStage, StageStatus.IN_PROGRESS);
  }

  withStatus(status: StageStatus): WorkflowState {
    return this.transitionTo(this.stage, status);
  }

  getDescription(): string {
    const metadata = this.getMetadata();
    const statusDescriptions: Record<StageStatus, string> = {
      awaiting_approval: "awaiting approval",
      in_progress: "in progress",
      rejected: "rejected",
      completed: "completed",
      failed: "failed",
    };
    return `${metadata.name} - ${statusDescriptions[this.status]}`;
  }

  toJSON() {
    return {
      stage: this.stage,
      status: this.status,
    };
  }

  static fromJSON(data: { stage: WorkflowStage; status: StageStatus }): WorkflowState {
    return new WorkflowState(data.stage, data.status);
  }
}

export const STATES = {
  OUTLINE_IN_PROGRESS: new WorkflowState(WorkflowStage.OUTLINE_GENERATION, StageStatus.IN_PROGRESS),
  OUTLINE_AWAITING_APPROVAL: new WorkflowState(
    WorkflowStage.OUTLINE_GENERATION,
    StageStatus.AWAITING_APPROVAL
  ),
  OUTLINE_APPROVED: new WorkflowState(WorkflowStage.OUTLINE_GENERATION, StageStatus.COMPLETED),
  OUTLINE_REJECTED: new WorkflowState(WorkflowStage.OUTLINE_GENERATION, StageStatus.REJECTED),
  OUTLINE_FAILED: new WorkflowState(WorkflowStage.OUTLINE_GENERATION, StageStatus.FAILED),

  RESEARCH_QUERY_IN_PROGRESS: new WorkflowState(
    WorkflowStage.RESEARCH_QUERY_GENERATION,
    StageStatus.IN_PROGRESS
  ),
  RESEARCH_QUERY_AWAITING_APPROVAL: new WorkflowState(
    WorkflowStage.RESEARCH_QUERY_GENERATION,
    StageStatus.AWAITING_APPROVAL
  ),
  RESEARCH_QUERY_APPROVED: new WorkflowState(
    WorkflowStage.RESEARCH_QUERY_GENERATION,
    StageStatus.COMPLETED
  ),
  RESEARCH_QUERY_REJECTED: new WorkflowState(
    WorkflowStage.RESEARCH_QUERY_GENERATION,
    StageStatus.REJECTED
  ),
  RESEARCH_QUERY_FAILED: new WorkflowState(
    WorkflowStage.RESEARCH_QUERY_GENERATION,
    StageStatus.FAILED
  ),

  RESEARCH_IN_PROGRESS: new WorkflowState(
    WorkflowStage.RESEARCH_EXECUTION,
    StageStatus.IN_PROGRESS
  ),
  RESEARCH_COMPLETED: new WorkflowState(WorkflowStage.RESEARCH_EXECUTION, StageStatus.COMPLETED),
  RESEARCH_FAILED: new WorkflowState(WorkflowStage.RESEARCH_EXECUTION, StageStatus.FAILED),

  RESEARCH_SUMMARIZATION_IN_PROGRESS: new WorkflowState(
    WorkflowStage.RESEARCH_SUMMARIZATION,
    StageStatus.IN_PROGRESS
  ),
  RESEARCH_SUMMARIZATION_COMPLETED: new WorkflowState(
    WorkflowStage.RESEARCH_SUMMARIZATION,
    StageStatus.COMPLETED
  ),
  RESEARCH_SUMMARIZATION_FAILED: new WorkflowState(
    WorkflowStage.RESEARCH_SUMMARIZATION,
    StageStatus.FAILED
  ),

  DRAFT_IN_PROGRESS: new WorkflowState(WorkflowStage.DRAFT_GENERATION, StageStatus.IN_PROGRESS),
  DRAFT_AWAITING_APPROVAL: new WorkflowState(
    WorkflowStage.DRAFT_GENERATION,
    StageStatus.AWAITING_APPROVAL
  ),
  DRAFT_APPROVED: new WorkflowState(WorkflowStage.DRAFT_GENERATION, StageStatus.COMPLETED),
  DRAFT_REJECTED: new WorkflowState(WorkflowStage.DRAFT_GENERATION, StageStatus.REJECTED),
  DRAFT_FAILED: new WorkflowState(WorkflowStage.DRAFT_GENERATION, StageStatus.FAILED),

  VERIFICATION_IN_PROGRESS: new WorkflowState(WorkflowStage.VERIFICATION, StageStatus.IN_PROGRESS),
  VERIFICATION_COMPLETED: new WorkflowState(WorkflowStage.VERIFICATION, StageStatus.COMPLETED),
  VERIFICATION_FAILED: new WorkflowState(WorkflowStage.VERIFICATION, StageStatus.FAILED),

  INTERNAL_LINKING_IN_PROGRESS: new WorkflowState(
    WorkflowStage.INTERNAL_LINKING,
    StageStatus.IN_PROGRESS
  ),
  INTERNAL_LINKING_COMPLETED: new WorkflowState(
    WorkflowStage.INTERNAL_LINKING,
    StageStatus.COMPLETED
  ),
  INTERNAL_LINKING_FAILED: new WorkflowState(WorkflowStage.INTERNAL_LINKING, StageStatus.FAILED),

  COMPLETED: new WorkflowState(WorkflowStage.COMPLETED, StageStatus.COMPLETED),
} as const;
