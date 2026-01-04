import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Initial state structure matching Zustand store
const INITIAL_STATE = {
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
};

export type AppState = typeof INITIAL_STATE;

/**
 * Ensure data directory exists
 */
export async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log(`Created data directory: ${DATA_DIR}`);
  }
}

/**
 * Read state from JSON file
 */
export async function readState(): Promise<AppState> {
  await ensureDataDir();

  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    // Merge with initial state to ensure all keys exist
    return { ...INITIAL_STATE, ...parsed };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist, return initial state
      return { ...INITIAL_STATE };
    }
    throw error;
  }
}

/**
 * Write state to JSON file (atomic write)
 */
export async function writeState(state: AppState): Promise<void> {
  await ensureDataDir();

  const tempFile = `${DATA_FILE}.tmp`;
  const data = JSON.stringify(state, null, 2);

  // Write to temp file first, then rename for atomic operation
  await fs.writeFile(tempFile, data, 'utf-8');
  await fs.rename(tempFile, DATA_FILE);
}

/**
 * Merge partial state with existing state
 */
export async function mergeState(partialState: Partial<AppState>): Promise<AppState> {
  const currentState = await readState();
  const newState = { ...currentState, ...partialState };
  await writeState(newState);
  return newState;
}
