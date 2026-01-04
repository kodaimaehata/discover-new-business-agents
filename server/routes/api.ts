import { Router, Request, Response } from 'express';
import { readState, writeState, mergeState, type AppState } from '../services/storage.js';

const router = Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get entire state
router.get('/state', async (_req: Request, res: Response) => {
  try {
    const state = await readState();
    res.json(state);
  } catch (error) {
    console.error('Failed to read state:', error);
    res.status(500).json({ error: 'Failed to read state' });
  }
});

// Replace entire state
router.put('/state', async (req: Request, res: Response) => {
  try {
    const state = req.body as AppState;
    await writeState(state);
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Failed to write state:', error);
    res.status(500).json({ error: 'Failed to write state' });
  }
});

// Partial state update
router.patch('/state', async (req: Request, res: Response) => {
  try {
    const partialState = req.body as Partial<AppState>;
    await mergeState(partialState);
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Failed to merge state:', error);
    res.status(500).json({ error: 'Failed to merge state' });
  }
});

// Migrate from localStorage
router.post('/migrate', async (req: Request, res: Response) => {
  try {
    const { state } = req.body as { state: AppState };
    if (!state) {
      res.status(400).json({ error: 'No state provided' });
      return;
    }
    await writeState(state);
    res.json({ success: true, migrated: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Failed to migrate state:', error);
    res.status(500).json({ error: 'Failed to migrate state' });
  }
});

export default router;
