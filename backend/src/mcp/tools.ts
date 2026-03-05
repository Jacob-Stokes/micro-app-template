/**
 * MCP tool definitions. Replace these with your own domain tools.
 * Each tool gets the authenticated userId from the OAuth token via extra.authInfo.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { v4 as uuidv4 } from 'uuid';
import { db, Item } from '../db/database';

function asTextContent(obj: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(obj, null, 2) }] };
}

function getUserId(extra: any): string {
  const userId = extra?.authInfo?.extra?.userId;
  if (!userId) throw new Error('Authentication required');
  return userId;
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: process.env.APP_NAME || 'myapp',
    version: '1.0.0',
  });

  // ─── Example tool: list_items ─────────────────────────────

  server.registerTool('list_items', {
    description: 'List all items for the authenticated user.',
    inputSchema: {},
  }, async (_args, extra) => {
    const userId = getUserId(extra);
    const items = db.prepare('SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Item[];
    return asTextContent(items);
  });

  // ─── Example tool: create_item ────────────────────────────

  server.registerTool('create_item', {
    description: 'Create a new item.',
    inputSchema: {
      title: z.string().describe('Item title'),
      description: z.string().optional().describe('Item description'),
    },
  }, async (args, extra) => {
    const userId = getUserId(extra);
    const id = uuidv4();
    db.prepare(`
      INSERT INTO items (id, user_id, title, description)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, args.title, args.description || null);

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item;
    return asTextContent(item);
  });

  // ─── Example tool: delete_item ────────────────────────────

  server.registerTool('delete_item', {
    description: 'Delete an item by ID.',
    inputSchema: {
      id: z.string().describe('Item ID to delete'),
    },
  }, async (args, extra) => {
    const userId = getUserId(extra);
    const result = db.prepare('DELETE FROM items WHERE id = ? AND user_id = ?').run(args.id, userId);
    if (result.changes === 0) {
      return asTextContent({ error: 'Item not found or access denied' });
    }
    return asTextContent({ deleted: true, id: args.id });
  });

  return server;
}
