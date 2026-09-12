import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  githubId: text('github_id').notNull().unique(),
  githubLogin: text('github_login').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url').notNull(),
  githubTokenCiphertext: text('github_token_ciphertext'),
  publicEnabled: integer('public_enabled', { mode: 'boolean' }).notNull().default(false),
  leaderboardEnabled: integer('leaderboard_enabled', { mode: 'boolean' }).notNull().default(false),
  conversationEnabled: integer('conversation_enabled', { mode: 'boolean' }).notNull().default(false),
  storageMode: text('storage_mode', { enum: ['managed', 'github'] }).notNull().default('managed'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  collectorVersion: text('collector_version').notNull(),
  deviceCodeHash: text('device_code_hash').notNull().unique(),
  userCodeHash: text('user_code_hash').notNull().unique(),
  deviceTokenHash: text('device_token_hash').unique(),
  status: text('status', { enum: ['pending', 'approved', 'revoked'] }).notNull().default('pending'),
  tokenDelivered: integer('token_delivered', { mode: 'boolean' }).notNull().default(false),
  expiresAt: text('expires_at').notNull(),
  lastSeenAt: text('last_seen_at'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_devices_user_id').on(table.userId), index('idx_devices_status_expires').on(table.status, table.expiresAt)]);

export const metricBatches = sqliteTable('metric_batches', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  generatedAt: text('generated_at').notNull(),
  collectorVersion: text('collector_version').notNull(),
  receivedAt: text('received_at').notNull(),
}, (table) => [index('idx_metric_batches_user_received').on(table.userId, table.receivedAt)]);

export const dailyMetrics = sqliteTable('daily_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  source: text('source').notNull(),
  category: text('category').notNull(),
  metricName: text('metric_name').notNull(),
  value: integer('value').notNull(),
  unit: text('unit').notNull(),
  provenance: text('provenance').notNull(),
  competitiveEligible: integer('competitive_eligible', { mode: 'boolean' }).notNull(),
}, (table) => [
  uniqueIndex('idx_daily_metrics_unique').on(table.userId, table.date, table.source, table.metricName, table.provenance),
  index('idx_daily_metrics_user_date').on(table.userId, table.date),
  index('idx_daily_metrics_leaderboard').on(table.competitiveEligible, table.date, table.source),
]);

export const sourceCoverage = sqliteTable('source_coverage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  coverageStart: text('coverage_start').notNull(),
  coverageEnd: text('coverage_end').notNull(),
  lastSyncedAt: text('last_synced_at').notNull(),
  completeness: text('completeness').notNull(),
  competitiveEligible: integer('competitive_eligible', { mode: 'boolean' }).notNull(),
  note: text('note'),
}, (table) => [uniqueIndex('idx_source_coverage_user_source').on(table.userId, table.source)]);

export const sessionStories = sqliteTable('session_stories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  tagsJson: text('tags_json').notNull().default('[]'),
  visibility: text('visibility', { enum: ['private', 'unlisted', 'public'] }).notNull().default('unlisted'),
  expiresAt: text('expires_at'),
  revokedAt: text('revoked_at'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_session_stories_user_created').on(table.userId, table.createdAt)]);

export const mcpEvents = sqliteTable('mcp_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  toolName: text('tool_name').notNull(),
  observedAt: text('observed_at').notNull(),
}, (table) => [index('idx_mcp_events_user_observed').on(table.userId, table.observedAt)]);

export const oauthCodes = sqliteTable('oauth_codes', {
  codeHash: text('code_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId: text('client_id').notNull(),
  redirectUri: text('redirect_uri').notNull(),
  codeChallenge: text('code_challenge').notNull(),
  scope: text('scope').notNull(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
});

export const oauthTokens = sqliteTable('oauth_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  scope: text('scope').notNull(),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_oauth_tokens_user').on(table.userId)]);

export const githubStorage = sqliteTable('github_storage', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  repoCiphertext: text('repo_ciphertext'),
  scopes: text('scopes').notNull().default(''),
  configuredAt: text('configured_at'),
});

export const comparisonOptins = sqliteTable('comparison_optins', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  updatedAt: text('updated_at').notNull(),
});
