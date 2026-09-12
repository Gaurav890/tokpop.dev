import { env } from 'cloudflare:workers';
import { ensureDb } from '../db/ensure';
import { sha256 } from './crypto';

export async function authenticateDevice(request: Request): Promise<{ id: string; userId: string } | null> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return null;
  await ensureDb();
  const row = await env.DB.prepare(`SELECT id,user_id FROM devices WHERE device_token_hash=? AND status='approved' LIMIT 1`).bind(await sha256(token)).first<{ id: string; user_id: string }>();
  return row?.user_id ? { id: row.id, userId: row.user_id } : null;
}
