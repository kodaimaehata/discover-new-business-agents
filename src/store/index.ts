import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import debounce from 'lodash.debounce';
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
  Stage,
  ExplorationGuardrail,
  WorkingMissionVision,
} from '../types';
import { checkHealth, fetchState, saveState, migrateFromLocalStorage, type DataState } from './api';

interface AppState {
  // Initialization state
  _initialized: boolean;
  _loading: boolean;
  _error: string | null;
  _serverAvailable: boolean;

  // Projects
  projects: Project[];
  currentProjectId: string | null;

  // Hypotheses
  hypotheses: Hypothesis[];

  // Experiments
  experiments: Experiment[];

  // Sessions
  sessions: Session[];

  // Decision Logs
  decisionLogs: DecisionLog[];

  // Metrics
  metrics: Metric[];
  nsmConfigs: NSMConfig[];

  // PMF Conditions
  pmfConditions: PMFCondition[];

  // PRDs
  prds: PRD[];

  // Roadmap
  roadmapItems: RoadmapItem[];

  // Outcomes
  outcomes: Outcome[];

  // Agent
  agentChatSessions: AgentChatSession[];
  currentChatSessionId: string | null;
  agentMessages: AgentMessage[];
  agentMemos: AgentMemo[];
  agentTasks: AgentTask[];

  // Documents
  documents: Document[];

  // Working Mission/Vision
  explorationGuardrails: ExplorationGuardrail[];
  workingMissionVisions: WorkingMissionVision[];

  // Initialization Action
  initializeFromServer: () => Promise<void>;

  // Project Actions
  createProject: (name: string, description: string) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  updateProjectStage: (id: string, stage: Stage) => void;

  // Hypothesis Actions
  createHypothesis: (hypothesis: Omit<Hypothesis, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateHypothesis: (id: string, updates: Partial<Hypothesis>) => void;
  deleteHypothesis: (id: string) => void;

  // Experiment Actions
  createExperiment: (experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateExperiment: (id: string, updates: Partial<Experiment>) => void;
  deleteExperiment: (id: string) => void;

  // Session Actions
  createSession: (session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;

  // Decision Log Actions
  createDecisionLog: (log: Omit<DecisionLog, 'id' | 'createdAt'>) => string;

  // Metric Actions
  createMetric: (metric: Omit<Metric, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateMetric: (id: string, updates: Partial<Metric>) => void;
  deleteMetric: (id: string) => void;

  // NSM Config Actions
  setNSMConfig: (config: Omit<NSMConfig, 'id' | 'createdAt' | 'updatedAt'>) => string;

  // PMF Condition Actions
  createPMFCondition: (condition: Omit<PMFCondition, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updatePMFCondition: (id: string, updates: Partial<PMFCondition>) => void;
  deletePMFCondition: (id: string) => void;

  // PRD Actions
  createPRD: (prd: Omit<PRD, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updatePRD: (id: string, updates: Partial<PRD>) => void;
  deletePRD: (id: string) => void;

  // Roadmap Actions
  createRoadmapItem: (item: Omit<RoadmapItem, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateRoadmapItem: (id: string, updates: Partial<RoadmapItem>) => void;
  deleteRoadmapItem: (id: string) => void;

  // Outcome Actions
  createOutcome: (outcome: Omit<Outcome, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateOutcome: (id: string, updates: Partial<Outcome>) => void;
  deleteOutcome: (id: string) => void;

  // Agent Chat Session Actions
  createChatSession: (projectId: string, title: string) => string;
  updateChatSession: (id: string, updates: Partial<AgentChatSession>) => void;
  deleteChatSession: (id: string) => void;
  setCurrentChatSession: (id: string | null) => void;
  getProjectChatSessions: (projectId: string) => AgentChatSession[];
  getSessionMessages: (sessionId: string) => AgentMessage[];

  // Agent Actions
  addAgentMessage: (message: Omit<AgentMessage, 'id' | 'createdAt'>) => void;
  clearAgentMessages: () => void;
  clearSessionMessages: (sessionId: string) => void;
  createAgentMemo: (memo: Omit<AgentMemo, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateAgentMemo: (id: string, updates: Partial<AgentMemo>) => void;
  deleteAgentMemo: (id: string) => void;
  getProjectMemos: (projectId: string) => AgentMemo[];
  createAgentTask: (task: Omit<AgentTask, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateAgentTask: (id: string, updates: Partial<AgentTask>) => void;

  // Document Actions
  createDocument: (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;

  // Exploration Guardrail Actions
  createGuardrail: (guardrail: Omit<ExplorationGuardrail, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateGuardrail: (id: string, updates: Partial<ExplorationGuardrail>) => void;
  deleteGuardrail: (id: string) => void;
  getProjectGuardrail: (projectId: string) => ExplorationGuardrail | undefined;

  // Working Mission/Vision Actions
  createWorkingMV: (wmv: Omit<WorkingMissionVision, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateWorkingMV: (id: string, updates: Partial<WorkingMissionVision>) => void;
  deleteWorkingMV: (id: string) => void;
  getProjectWorkingMV: (projectId: string) => WorkingMissionVision | undefined;

  // Utility
  getProjectHypotheses: (projectId: string) => Hypothesis[];
  getProjectExperiments: (projectId: string) => Experiment[];
  getProjectSessions: (projectId: string) => Session[];
  getProjectMetrics: (projectId: string) => Metric[];
  getProjectPRDs: (projectId: string) => PRD[];
  getProjectDocuments: (projectId: string) => Document[];
}

const now = () => new Date().toISOString();

// Extract data state (exclude internal state and functions)
function getDataState(state: AppState): DataState {
  return {
    projects: state.projects,
    currentProjectId: state.currentProjectId,
    hypotheses: state.hypotheses,
    experiments: state.experiments,
    sessions: state.sessions,
    decisionLogs: state.decisionLogs,
    metrics: state.metrics,
    nsmConfigs: state.nsmConfigs,
    pmfConditions: state.pmfConditions,
    prds: state.prds,
    roadmapItems: state.roadmapItems,
    outcomes: state.outcomes,
    agentChatSessions: state.agentChatSessions,
    currentChatSessionId: state.currentChatSessionId,
    agentMessages: state.agentMessages,
    agentMemos: state.agentMemos,
    agentTasks: state.agentTasks,
    documents: state.documents,
    explorationGuardrails: state.explorationGuardrails,
    workingMissionVisions: state.workingMissionVisions,
  };
}

export const useStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initialization State
    _initialized: false,
    _loading: false,
    _error: null,
    _serverAvailable: false,

    // Initial Data State
    projects: [],
    currentProjectId: null,
    hypotheses: [],
    experiments: [],
    sessions: [],
    decisionLogs: [],
    metrics: [],
    nsmConfigs: [],
    pmfConditions: [],
    prds: [],
    roadmapItems: [],
    outcomes: [],
    agentChatSessions: [],
    currentChatSessionId: null,
    agentMessages: [],
    agentMemos: [],
    agentTasks: [],
    documents: [],
    explorationGuardrails: [],
    workingMissionVisions: [],

    // Initialization Action
    initializeFromServer: async () => {
      set({ _loading: true, _error: null });

      try {
        const serverAvailable = await checkHealth();

        if (serverAvailable) {
          // Check for localStorage data to migrate
          const localData = localStorage.getItem('vpop-storage');
          if (localData) {
            try {
              const parsed = JSON.parse(localData);
              if (parsed.state && Object.keys(parsed.state.projects || []).length > 0) {
                // Migrate localStorage data to server
                await migrateFromLocalStorage(parsed.state);
                console.log('Migrated data from localStorage to server');
              }
            } catch (e) {
              console.warn('Failed to parse localStorage data:', e);
            }
            localStorage.removeItem('vpop-storage');
          }

          // Load state from server
          const serverState = await fetchState();
          set({
            ...serverState,
            _initialized: true,
            _loading: false,
            _serverAvailable: true,
          });
        } else {
          // Fallback to localStorage if server unavailable
          console.warn('Server unavailable, falling back to localStorage');
          const localData = localStorage.getItem('vpop-storage');
          if (localData) {
            try {
              const parsed = JSON.parse(localData);
              if (parsed.state) {
                set({
                  ...parsed.state,
                  _initialized: true,
                  _loading: false,
                  _serverAvailable: false,
                });
                return;
              }
            } catch (e) {
              console.warn('Failed to parse localStorage data:', e);
            }
          }
          set({ _initialized: true, _loading: false, _serverAvailable: false });
        }
      } catch (error) {
        console.error('Failed to initialize from server:', error);
        set({
          _initialized: true,
          _loading: false,
          _error: error instanceof Error ? error.message : 'Failed to load data',
          _serverAvailable: false,
        });
      }
    },

    // Project Actions
    createProject: (name, description) => {
      const id = uuidv4();
      const project: Project = {
        id,
        name,
        description,
        stage: 'WILL_ENTRY',
        pmfConditions: [],
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({ projects: [...state.projects, project] }));
      return id;
    },

    updateProject: (id, updates) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: now() } : p
        ),
      }));
    },

    deleteProject: (id) => {
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        hypotheses: state.hypotheses.filter((h) => h.projectId !== id),
        experiments: state.experiments.filter((e) => e.projectId !== id),
        sessions: state.sessions.filter((s) => s.projectId !== id),
        metrics: state.metrics.filter((m) => m.projectId !== id),
        prds: state.prds.filter((p) => p.projectId !== id),
        documents: state.documents.filter((d) => d.projectId !== id),
      }));
    },

    setCurrentProject: (id) => {
      set({ currentProjectId: id });
    },

    updateProjectStage: (id, stage) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, stage, updatedAt: now() } : p
        ),
      }));
    },

    // Hypothesis Actions
    createHypothesis: (hypothesis) => {
      const id = uuidv4();
      const newHypothesis: Hypothesis = {
        ...hypothesis,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({ hypotheses: [...state.hypotheses, newHypothesis] }));
      return id;
    },

    updateHypothesis: (id, updates) => {
      set((state) => ({
        hypotheses: state.hypotheses.map((h) =>
          h.id === id ? { ...h, ...updates, updatedAt: now() } : h
        ),
      }));
    },

    deleteHypothesis: (id) => {
      set((state) => ({
        hypotheses: state.hypotheses.filter((h) => h.id !== id),
      }));
    },

    // Experiment Actions
    createExperiment: (experiment) => {
      const id = uuidv4();
      const newExperiment: Experiment = {
        ...experiment,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({ experiments: [...state.experiments, newExperiment] }));
      return id;
    },

    updateExperiment: (id, updates) => {
      set((state) => ({
        experiments: state.experiments.map((e) =>
          e.id === id ? { ...e, ...updates, updatedAt: now() } : e
        ),
      }));
    },

    deleteExperiment: (id) => {
      set((state) => ({
        experiments: state.experiments.filter((e) => e.id !== id),
      }));
    },

    // Session Actions
    createSession: (session) => {
      const id = uuidv4();
      const newSession: Session = {
        ...session,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({ sessions: [...state.sessions, newSession] }));
      return id;
    },

    updateSession: (id, updates) => {
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: now() } : s
        ),
      }));
    },

    deleteSession: (id) => {
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
      }));
    },

    // Decision Log Actions
    createDecisionLog: (log) => {
      const id = uuidv4();
      const newLog: DecisionLog = {
        ...log,
        id,
        createdAt: now(),
      };
      set((state) => ({ decisionLogs: [...state.decisionLogs, newLog] }));
      return id;
    },

    // Metric Actions
    createMetric: (metric) => {
      const id = uuidv4();
      const newMetric: Metric = {
        ...metric,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({ metrics: [...state.metrics, newMetric] }));
      return id;
    },

    updateMetric: (id, updates) => {
      set((state) => ({
        metrics: state.metrics.map((m) =>
          m.id === id ? { ...m, ...updates, updatedAt: now() } : m
        ),
      }));
    },

    deleteMetric: (id) => {
      set((state) => ({
        metrics: state.metrics.filter((m) => m.id !== id),
      }));
    },

    // NSM Config Actions
    setNSMConfig: (config) => {
      const id = uuidv4();
      const newConfig: NSMConfig = {
        ...config,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({
        nsmConfigs: [
          ...state.nsmConfigs.filter((c) => c.projectId !== config.projectId),
          newConfig,
        ],
      }));
      return id;
    },

    // PMF Condition Actions
    createPMFCondition: (condition) => {
      const id = uuidv4();
      const newCondition: PMFCondition = {
        ...condition,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({ pmfConditions: [...state.pmfConditions, newCondition] }));
      return id;
    },

    updatePMFCondition: (id, updates) => {
      set((state) => ({
        pmfConditions: state.pmfConditions.map((c) =>
          c.id === id ? { ...c, ...updates, updatedAt: now() } : c
        ),
      }));
    },

    deletePMFCondition: (id) => {
      set((state) => ({
        pmfConditions: state.pmfConditions.filter((c) => c.id !== id),
      }));
    },

    // PRD Actions
    createPRD: (prd) => {
      const id = uuidv4();
      const newPRD: PRD = {
        ...prd,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({ prds: [...state.prds, newPRD] }));
      return id;
    },

    updatePRD: (id, updates) => {
      set((state) => ({
        prds: state.prds.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: now() } : p
        ),
      }));
    },

    deletePRD: (id) => {
      set((state) => ({
        prds: state.prds.filter((p) => p.id !== id),
      }));
    },

    // Roadmap Actions
    createRoadmapItem: (item) => {
      const id = uuidv4();
      const newItem: RoadmapItem = {
        ...item,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({ roadmapItems: [...state.roadmapItems, newItem] }));
      return id;
    },

    updateRoadmapItem: (id, updates) => {
      set((state) => ({
        roadmapItems: state.roadmapItems.map((i) =>
          i.id === id ? { ...i, ...updates, updatedAt: now() } : i
        ),
      }));
    },

    deleteRoadmapItem: (id) => {
      set((state) => ({
        roadmapItems: state.roadmapItems.filter((i) => i.id !== id),
      }));
    },

    // Outcome Actions
    createOutcome: (outcome) => {
      const id = uuidv4();
      const newOutcome: Outcome = {
        ...outcome,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({ outcomes: [...state.outcomes, newOutcome] }));
      return id;
    },

    updateOutcome: (id, updates) => {
      set((state) => ({
        outcomes: state.outcomes.map((o) =>
          o.id === id ? { ...o, ...updates, updatedAt: now() } : o
        ),
      }));
    },

    deleteOutcome: (id) => {
      set((state) => ({
        outcomes: state.outcomes.filter((o) => o.id !== id),
      }));
    },

    // Agent Chat Session Actions
    createChatSession: (projectId, title) => {
      const id = uuidv4();
      const newSession: AgentChatSession = {
        id,
        projectId,
        title,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({
        agentChatSessions: [...state.agentChatSessions, newSession],
        currentChatSessionId: id,
      }));
      return id;
    },

    updateChatSession: (id, updates) => {
      set((state) => ({
        agentChatSessions: state.agentChatSessions.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: now() } : s
        ),
      }));
    },

    deleteChatSession: (id) => {
      set((state) => ({
        agentChatSessions: state.agentChatSessions.filter((s) => s.id !== id),
        agentMessages: state.agentMessages.filter((m) => m.sessionId !== id),
        currentChatSessionId: state.currentChatSessionId === id ? null : state.currentChatSessionId,
      }));
    },

    setCurrentChatSession: (id) => {
      set({ currentChatSessionId: id });
    },

    getProjectChatSessions: (projectId) => {
      return get().agentChatSessions.filter((s) => s.projectId === projectId);
    },

    getSessionMessages: (sessionId) => {
      return get().agentMessages.filter((m) => m.sessionId === sessionId);
    },

    // Agent Actions
    addAgentMessage: (message) => {
      const id = uuidv4();
      const newMessage: AgentMessage = {
        ...message,
        id,
        createdAt: now(),
      };
      set((state) => ({ agentMessages: [...state.agentMessages, newMessage] }));
    },

    clearAgentMessages: () => {
      set({ agentMessages: [] });
    },

    clearSessionMessages: (sessionId) => {
      set((state) => ({
        agentMessages: state.agentMessages.filter((m) => m.sessionId !== sessionId),
      }));
    },

    createAgentMemo: (memo) => {
      const id = uuidv4();
      const newMemo: AgentMemo = {
        ...memo,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({ agentMemos: [...state.agentMemos, newMemo] }));
      return id;
    },

    updateAgentMemo: (id, updates) => {
      set((state) => ({
        agentMemos: state.agentMemos.map((m) =>
          m.id === id ? { ...m, ...updates, updatedAt: now() } : m
        ),
      }));
    },

    deleteAgentMemo: (id) => {
      set((state) => ({
        agentMemos: state.agentMemos.filter((m) => m.id !== id),
      }));
    },

    getProjectMemos: (projectId) => {
      return get().agentMemos.filter((m) => m.projectId === projectId);
    },

    createAgentTask: (task) => {
      const id = uuidv4();
      const newTask: AgentTask = {
        ...task,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({ agentTasks: [...state.agentTasks, newTask] }));
      return id;
    },

    updateAgentTask: (id, updates) => {
      set((state) => ({
        agentTasks: state.agentTasks.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: now() } : t
        ),
      }));
    },

    // Document Actions
    createDocument: (doc) => {
      const id = uuidv4();
      const newDoc: Document = {
        ...doc,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({ documents: [...state.documents, newDoc] }));
      return id;
    },

    updateDocument: (id, updates) => {
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === id ? { ...d, ...updates, updatedAt: now() } : d
        ),
      }));
    },

    deleteDocument: (id) => {
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
      }));
    },

    // Exploration Guardrail Actions
    createGuardrail: (guardrail) => {
      const id = uuidv4();
      const newGuardrail: ExplorationGuardrail = {
        ...guardrail,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({
        explorationGuardrails: [...state.explorationGuardrails, newGuardrail],
      }));
      return id;
    },

    updateGuardrail: (id, updates) => {
      set((state) => ({
        explorationGuardrails: state.explorationGuardrails.map((g) =>
          g.id === id ? { ...g, ...updates, updatedAt: now() } : g
        ),
      }));
    },

    deleteGuardrail: (id) => {
      set((state) => ({
        explorationGuardrails: state.explorationGuardrails.filter((g) => g.id !== id),
      }));
    },

    getProjectGuardrail: (projectId) => {
      return get().explorationGuardrails.find((g) => g.projectId === projectId);
    },

    // Working Mission/Vision Actions
    createWorkingMV: (wmv) => {
      const id = uuidv4();
      const newWMV: WorkingMissionVision = {
        ...wmv,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      set((state) => ({
        workingMissionVisions: [...state.workingMissionVisions, newWMV],
      }));
      return id;
    },

    updateWorkingMV: (id, updates) => {
      set((state) => ({
        workingMissionVisions: state.workingMissionVisions.map((w) =>
          w.id === id ? { ...w, ...updates, updatedAt: now() } : w
        ),
      }));
    },

    deleteWorkingMV: (id) => {
      set((state) => ({
        workingMissionVisions: state.workingMissionVisions.filter((w) => w.id !== id),
      }));
    },

    getProjectWorkingMV: (projectId) => {
      return get().workingMissionVisions.find((w) => w.projectId === projectId);
    },

    // Utility Functions
    getProjectHypotheses: (projectId) => {
      return get().hypotheses.filter((h) => h.projectId === projectId);
    },

    getProjectExperiments: (projectId) => {
      return get().experiments.filter((e) => e.projectId === projectId);
    },

    getProjectSessions: (projectId) => {
      return get().sessions.filter((s) => s.projectId === projectId);
    },

    getProjectMetrics: (projectId) => {
      return get().metrics.filter((m) => m.projectId === projectId);
    },

    getProjectPRDs: (projectId) => {
      return get().prds.filter((p) => p.projectId === projectId);
    },

    getProjectDocuments: (projectId) => {
      return get().documents.filter((d) => d.projectId === projectId);
    },
  }))
);

// Debounced save function
const debouncedSave = debounce(async (state: AppState) => {
  const dataState = getDataState(state);

  if (!state._serverAvailable) {
    // Fallback to localStorage
    localStorage.setItem('vpop-storage', JSON.stringify({ state: dataState }));
    return;
  }

  try {
    await saveState(dataState);
  } catch (error) {
    console.error('Failed to save state to server:', error);
    // Save to localStorage as backup
    localStorage.setItem('vpop-storage-backup', JSON.stringify({
      state: dataState,
      timestamp: new Date().toISOString(),
    }));
  }
}, 1000);

// Subscribe to state changes and auto-save
useStore.subscribe(
  (state) => getDataState(state),
  (dataState, prevDataState) => {
    const state = useStore.getState();
    if (state._initialized && !state._loading && dataState !== prevDataState) {
      debouncedSave(state);
    }
  },
  { equalityFn: Object.is }
);
