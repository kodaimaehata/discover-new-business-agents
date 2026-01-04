import type {
  Project,
  Hypothesis,
  Experiment,
  Session,
  DecisionLog,
  Metric,
  NSMConfig,
  PMFCondition,
  PRD,
  RoadmapItem,
  Outcome,
  AgentMessage,
  AgentChatSession,
  AgentMemo,
  AgentTask,
  Document,
  ExplorationGuardrail,
  WorkingMissionVision,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface DataState {
  projects: Project[];
  currentProjectId: string | null;
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  sessions: Session[];
  decisionLogs: DecisionLog[];
  metrics: Metric[];
  nsmConfigs: NSMConfig[];
  pmfConditions: PMFCondition[];
  prds: PRD[];
  roadmapItems: RoadmapItem[];
  outcomes: Outcome[];
  agentChatSessions: AgentChatSession[];
  currentChatSessionId: string | null;
  agentMessages: AgentMessage[];
  agentMemos: AgentMemo[];
  agentTasks: AgentTask[];
  documents: Document[];
  // Working Mission/Vision関連
  explorationGuardrails: ExplorationGuardrail[];
  workingMissionVisions: WorkingMissionVision[];
}

/**
 * Check if API server is available
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch state from server
 */
export async function fetchState(): Promise<DataState> {
  const response = await fetch(`${API_URL}/state`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch state: ${response.status}`);
  }

  return response.json();
}

/**
 * Save entire state to server
 */
export async function saveState(state: DataState): Promise<void> {
  const response = await fetch(`${API_URL}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });

  if (!response.ok) {
    throw new Error(`Failed to save state: ${response.status}`);
  }
}

/**
 * Migrate localStorage data to server
 */
export async function migrateFromLocalStorage(state: DataState): Promise<void> {
  const response = await fetch(`${API_URL}/migrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });

  if (!response.ok) {
    throw new Error(`Failed to migrate state: ${response.status}`);
  }
}
