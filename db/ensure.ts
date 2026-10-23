import { getDatabase } from './client';

export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, github_id TEXT NOT NULL UNIQUE, github_login TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, avatar_url TEXT NOT NULL, github_token_ciphertext TEXT, public_enabled INTEGER NOT NULL DEFAULT 0, leaderboard_enabled INTEGER NOT NULL DEFAULT 0, conversation_enabled INTEGER NOT NULL DEFAULT 0, storage_mode TEXT NOT NULL DEFAULT 'managed', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, collector_version TEXT NOT NULL, device_code_hash TEXT NOT NULL UNIQUE, user_code_hash TEXT NOT NULL UNIQUE, device_token_hash TEXT UNIQUE, pending_token_ciphertext TEXT, status TEXT NOT NULL DEFAULT 'pending', token_delivered INTEGER NOT NULL DEFAULT 0, expires_at TEXT NOT NULL, last_seen_at TEXT, created_at TEXT NOT NULL)`,
  `ALTER TABLE devices ADD COLUMN IF NOT EXISTS pending_token_ciphertext TEXT`,
  `ALTER TABLE devices ADD COLUMN IF NOT EXISTS setup_receipt_json TEXT`,
  `CREATE TABLE IF NOT EXISTS metric_batches (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE, generated_at TEXT NOT NULL, collector_version TEXT NOT NULL, received_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS daily_metrics (id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL, source TEXT NOT NULL, category TEXT NOT NULL, metric_name TEXT NOT NULL, value INTEGER NOT NULL, unit TEXT NOT NULL, provenance TEXT NOT NULL, competitive_eligible INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS source_coverage (id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, source TEXT NOT NULL, coverage_start TEXT NOT NULL, coverage_end TEXT NOT NULL, last_synced_at TEXT NOT NULL, completeness TEXT NOT NULL, competitive_eligible INTEGER NOT NULL, note TEXT)`,
  `CREATE TABLE IF NOT EXISTS session_stories (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, source TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, tags_json TEXT NOT NULL DEFAULT '[]', visibility TEXT NOT NULL DEFAULT 'unlisted', expires_at TEXT, revoked_at TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS mcp_events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, source TEXT NOT NULL, tool_name TEXT NOT NULL, observed_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS oauth_codes (code_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, client_id TEXT NOT NULL, redirect_uri TEXT NOT NULL, code_challenge TEXT NOT NULL, scope TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS oauth_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, scope TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS github_storage (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, repo_ciphertext TEXT, scopes TEXT NOT NULL DEFAULT '', configured_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS comparison_optins (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, enabled INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_devices_status_expires ON devices(status, expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_metric_batches_user_received ON metric_batches(user_id, received_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_metrics_unique ON daily_metrics(user_id, date, source, metric_name, provenance)`,
  `CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_date ON daily_metrics(user_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_daily_metrics_leaderboard ON daily_metrics(competitive_eligible, date, source)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_source_coverage_user_source ON source_coverage(user_id, source)`,
  `CREATE INDEX IF NOT EXISTS idx_session_stories_user_created ON session_stories(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_mcp_events_user_observed ON mcp_events(user_id, observed_at)`,
  `CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user ON oauth_tokens(user_id)`,
];

let ready: Promise<void> | undefined;

export function ensureDb(): Promise<void> {
  ready ??= (async () => {
    const database = getDatabase();
    await database.batch(schemaStatements.map((statement) => database.prepare(statement)));
  })();
  return ready;
}
