import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database';

// Extend Express Request type to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      username: string;
      is_admin: boolean;
    };
  }
}

function validateApiKey(apiKey: string, record: any): boolean {
  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return false;
  }
  return bcrypt.compareSync(apiKey, record.key_hash);
}

function resolveApiKey(req: Request): string | null {
  const headerKey = req.headers['x-api-key'] as string;
  if (headerKey) return headerKey;

  const queryKey = req.query.apiKey as string;
  if (!queryKey) return null;

  const keyId = queryKey.substring(0, 36);
  const user = db.prepare(`
    SELECT u.allow_query_param_auth
    FROM api_keys ak
    JOIN users u ON ak.user_id = u.id
    WHERE ak.id = ?
  `).get(keyId) as any;

  if (user && user.allow_query_param_auth === 0) {
    return null;
  }

  return queryKey;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = resolveApiKey(req);

  if (apiKey) {
    const keyId = apiKey.substring(0, 36);

    const apiKeyRecord = db.prepare(`
      SELECT ak.*, u.id as user_id, u.username, u.is_admin
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE ak.id = ?
    `).get(keyId) as any;

    if (apiKeyRecord && validateApiKey(apiKey, apiKeyRecord)) {
      db.prepare(`UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`).run(apiKeyRecord.id);

      req.user = {
        id: apiKeyRecord.user_id,
        username: apiKeyRecord.username,
        is_admin: !!apiKeyRecord.is_admin
      };
      return next();
    }
  }

  if (req.session && (req.session as any).userId) {
    const user = db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get((req.session as any).userId) as any;

    if (user) {
      req.user = {
        id: user.id,
        username: user.username,
        is_admin: !!user.is_admin
      };
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Authentication required. Please login or provide a valid API key.'
  });
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = resolveApiKey(req);

  if (apiKey) {
    const keyId = apiKey.substring(0, 36);
    const apiKeyRecord = db.prepare(`
      SELECT ak.*, u.id as user_id, u.username, u.is_admin
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE ak.id = ?
    `).get(keyId) as any;

    if (apiKeyRecord && validateApiKey(apiKey, apiKeyRecord)) {
      db.prepare(`UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`).run(apiKeyRecord.id);
      req.user = {
        id: apiKeyRecord.user_id,
        username: apiKeyRecord.username,
        is_admin: !!apiKeyRecord.is_admin
      };
    }
  } else if (req.session && (req.session as any).userId) {
    const user = db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get((req.session as any).userId) as any;
    if (user) {
      req.user = {
        id: user.id,
        username: user.username,
        is_admin: !!user.is_admin
      };
    }
  }

  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required.'
    });
  }
  next();
};
