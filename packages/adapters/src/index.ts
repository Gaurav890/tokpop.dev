import type { DailyActivity, MetricName, Provenance, SourceCoverage, SourceSurface } from '@ai-native-profile/schema';

export type AdapterResult = {
  source: SourceSurface;
  daily: DailyActivity[];
  coverage: SourceCoverage;
  warnings: string[];
};

type ClaudeStats = {
  dailyActivity?: Array<{ date?: string; messageCount?: number; sessionCount?: number; toolCallCount?: number }>;
  dailyModelTokens?: Array<{ date?: string; tokensByModel?: Record<string, number> }>;
};

type CodexUsage = {
  summary?: {
    lifetimeTokens?: number | null;
    peakDailyTokens?: number | null;
    longestRunningTurnSec?: number | null;
    currentStreakDays?: number | null;
    longestStreakDays?: number | null;
  } | null;
  dailyUsageBuckets?: Array<{ startDate?: string; tokens?: number }> | null;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const safeCount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
const today = () => new Date().toISOString().slice(0, 10);

function metric(name: MetricName, value: number, source: SourceSurface, provenance: Provenance, date: string, competitiveEligible = true) {
  return { name, value, unit: name === 'duration_seconds' ? 'seconds' : 'count', source, provenance, coverageStart: date, coverageEnd: date, competitiveEligible } as const;
}

function coverage(source: SourceSurface, dates: string[], provenance: Provenance, competitiveEligible: boolean, note?: string): SourceCoverage {
  const sorted = [...dates].filter((date) => datePattern.test(date)).sort();
  return {
    source,
    coverageStart: sorted[0] ?? today(),
    coverageEnd: sorted.at(-1) ?? today(),
    lastSyncedAt: new Date().toISOString(),
    completeness: provenance === 'official_account_api' || provenance === 'local_exact' ? 'full' : 'partial',
    competitiveEligible,
    note,
  };
}

export function parseCodexUsage(value: unknown): AdapterResult {
  const input = (value ?? {}) as CodexUsage;
  const warnings: string[] = [];
  const buckets = Array.isArray(input.dailyUsageBuckets) ? input.dailyUsageBuckets : [];
  const daily = buckets.flatMap((bucket): DailyActivity[] => {
    if (!bucket.startDate || !datePattern.test(bucket.startDate)) {
      warnings.push('Skipped a Codex usage bucket with an invalid date.');
      return [];
    }
    return [{
      date: bucket.startDate,
      source: 'codex',
      category: 'coding',
      metrics: [metric('tokens', safeCount(bucket.tokens), 'codex', 'official_account_api', bucket.startDate)],
    }];
  });
  if (!input.summary) warnings.push('Codex did not return summary metrics.');
  return { source: 'codex', daily, coverage: coverage('codex', daily.map((day) => day.date), 'official_account_api', true), warnings };
}

export function parseClaudeStatsCache(value: unknown): AdapterResult {
  const input = (value ?? {}) as ClaudeStats;
  const warnings: string[] = [];
  const tokenByDate = new Map<string, Record<string, number>>();
  for (const row of input.dailyModelTokens ?? []) {
    if (row.date && datePattern.test(row.date)) tokenByDate.set(row.date, row.tokensByModel ?? {});
  }
  const daily = (input.dailyActivity ?? []).flatMap((row): DailyActivity[] => {
    if (!row.date || !datePattern.test(row.date)) {
      warnings.push('Skipped a Claude activity row with an invalid date.');
      return [];
    }
    const models = tokenByDate.get(row.date) ?? {};
    const tokens = Object.values(models).reduce((sum, count) => sum + safeCount(count), 0);
    return [{
      date: row.date,
      source: 'claude_code',
      category: 'coding',
      metrics: [
        metric('sessions', safeCount(row.sessionCount), 'claude_code', 'local_exact', row.date),
        metric('turns', safeCount(row.messageCount), 'claude_code', 'local_exact', row.date),
        metric('tool_calls', safeCount(row.toolCallCount), 'claude_code', 'local_exact', row.date),
        ...(tokens ? [metric('tokens', tokens, 'claude_code', 'local_exact', row.date)] : []),
      ],
      models,
    }];
  });
  if (!daily.length) warnings.push('Claude statistics contained no dated activity.');
  return { source: 'claude_code', daily, coverage: coverage('claude_code', daily.map((day) => day.date), 'local_exact', true), warnings };
}

type JsonlOptions = {
  source: Extract<SourceSurface, 'cursor' | 'gemini_cli' | 'copilot_cli'>;
  provenance: Extract<Provenance, 'local_derived' | 'estimated'>;
  timestampKeys?: string[];
  sessionEventNames?: string[];
  toolEventNames?: string[];
};

export function parseJsonlActivity(text: string, options: JsonlOptions): AdapterResult {
  const timestampKeys = options.timestampKeys ?? ['timestamp', 'time', 'created_at', 'createdAt'];
  const sessionEvents = new Set(options.sessionEventNames ?? ['session_start', 'session.created', 'session_started']);
  const toolEvents = new Set(options.toolEventNames ?? ['tool_call', 'tool.called', 'tool_use']);
  const rows = new Map<string, { sessions: number; tools: number; turns: number }>();
  const warnings: string[] = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      const stamp = timestampKeys.map((key) => event[key]).find((value) => typeof value === 'string' || typeof value === 'number');
      const date = new Date(stamp as string | number).toISOString().slice(0, 10);
      if (!datePattern.test(date)) continue;
      const current = rows.get(date) ?? { sessions: 0, tools: 0, turns: 0 };
      const eventName = String(event.type ?? event.event ?? event.name ?? '');
      current.turns += 1;
      if (sessionEvents.has(eventName)) current.sessions += 1;
      if (toolEvents.has(eventName)) current.tools += 1;
      rows.set(date, current);
    } catch {
      warnings.push(`Skipped malformed JSONL line ${index + 1}.`);
    }
  }
  const daily: DailyActivity[] = [...rows.entries()].sort().map(([date, row]) => ({
    date,
    source: options.source,
    category: 'coding',
    metrics: [
      metric('sessions', row.sessions, options.source, options.provenance, date, options.provenance !== 'estimated'),
      metric('turns', row.turns, options.source, options.provenance, date, options.provenance !== 'estimated'),
      metric('tool_calls', row.tools, options.source, options.provenance, date, options.provenance !== 'estimated'),
    ],
  }));
  return {
    source: options.source,
    daily,
    coverage: coverage(options.source, daily.map((day) => day.date), options.provenance, options.provenance !== 'estimated', 'Coverage depends on locally retained event logs.'),
    warnings,
  };
}

export const parseCursorEvents = (text: string) => parseJsonlActivity(text, { source: 'cursor', provenance: 'local_derived' });
export const parseGeminiTelemetry = (text: string) => parseJsonlActivity(text, { source: 'gemini_cli', provenance: 'local_derived' });
export const parseCopilotCliEvents = (text: string) => parseJsonlActivity(text, { source: 'copilot_cli', provenance: 'local_derived' });

export { privacyCheck } from './privacy';
export { parseConversationExport, type ExportAggregate } from './exports';
