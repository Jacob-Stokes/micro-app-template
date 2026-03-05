import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { initDatabase, db } from './db/database';
import authRouter from './routes/auth';
import { requireAuth } from './middleware/auth';
import { setupMcpRoutes } from './mcp/server';
import { ok, serverError } from './utils/response';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3001;
const APP_NAME = process.env.APP_NAME || 'myapp';

app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('WARNING: SESSION_SECRET is not set. This is unsafe in production.');
  } else {
    console.warn('WARNING: SESSION_SECRET is not set. Using insecure default for development.');
  }
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Initialize database
initDatabase();

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: `${APP_NAME} API is running` });
});

// Auth routes (no auth required)
app.use('/api/auth', authRouter);

// ─── Your domain routes go here ─────────────────────────────
// Example: items CRUD
app.get('/api/items', requireAuth, (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
    ok(res, items);
  } catch (error: any) {
    serverError(res, error);
  }
});

app.post('/api/items', requireAuth, (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Title is required' });

    const id = uuidv4();
    db.prepare('INSERT INTO items (id, user_id, title, description) VALUES (?, ?, ?, ?)').run(id, req.user!.id, title, description || null);

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    ok(res, item, 201);
  } catch (error: any) {
    serverError(res, error);
  }
});

app.delete('/api/items/:id', requireAuth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM items WHERE id = ? AND user_id = ?').run(req.params.id as string, req.user!.id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'Item not found' });
    ok(res, { deleted: true });
  } catch (error: any) {
    serverError(res, error);
  }
});

// Remote MCP endpoint with OAuth (must be before static files/SPA fallback)
setupMcpRoutes(app);

// Serve frontend static files in production (single-container mode)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SPA fallback
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`${APP_NAME} running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
