import { runtimeEnv as env } from './runtime-env';
import { ensureDb } from '../db/ensure';
import { sha256 } from './crypto';

export type McpIdentity = { userId: string; login: string; name: string; scope: string };

export async function authenticateMcp(request: Request): Promise<McpIdentity | null> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return null;
  await ensureDb();
  return env.DB.prepare(`SELECT t.user_id AS "userId", t.scope, u.github_login AS login, u.display_name AS name
    FROM oauth_tokens t JOIN users u ON u.id=t.user_id
    WHERE t.token_hash=? AND t.revoked_at IS NULL AND t.expires_at>? LIMIT 1`)
    .bind(await sha256(token), new Date().toISOString()).first<McpIdentity>();
}

export function hasScope(identity: McpIdentity, required: string): boolean {
  return identity.scope.split(/\s+/).includes(required);
}

export function containsSecret(value: string): boolean {
  const patterns = [
    /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
    /\bsk-[A-Za-z0-9_-]{20,}\b/,
    /\b(?:api[_-]?key|password|secret|token)\s*[:=]\s*\S+/i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  ];
  return patterns.some((pattern) => pattern.test(value));
}
