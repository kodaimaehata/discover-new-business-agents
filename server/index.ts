import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';
import { ensureDataDir } from './services/storage.js';

const app = express();
const PORT = process.env.API_PORT || 3001;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
}));

// JSON body parser with increased limit
app.use(express.json({ limit: '50mb' }));

// API routes
app.use('/api', apiRouter);

// Start server
async function start() {
  await ensureDataDir();
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
