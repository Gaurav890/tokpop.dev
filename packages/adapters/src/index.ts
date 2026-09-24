import type { Completeness, DailyActivity, MetricName, Provenance, SourceCoverage, SourceSurface } from '@ai-native-profile/schema';

export type AdapterResult = {
  source: SourceSurface;
  daily: DailyActivity[];
  coverage: SourceCoverage;
  warnings: string[];
};

type ClaudeStats = {
  dailyActivity?: Array<{ date?: string; messageCount?: number; sessionCount?: number; toolCallCount?: number }>;
  dailyModelTokens?: Array<{ date?: string; tokensByModel?: Record<string, number> }>;
  modelUsage?: Record<string, {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  }>;
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

function coverage(source: SourceSurface, dates: string[], provenance: Provenance, competitiveEligible: boolean, note?: string, completeness?: Completeness): SourceCoverage {
  const sorted = [...dates].filter((date) => datePattern.test(date)).sort();
  return {
    source,
    coverageStart: sorted[0] ?? today(),
    coverageEnd: sorted.at(-1) ?? today(),
    lastSyncedAt: new Date().toISOString(),
    completeness: completeness ?? (provenance === 'official_account_api' || provenance === 'local_exact' ? 'full' : 'partial'),
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
  const activityByDate = new Map((input.dailyActivity ?? []).filter((row) => row.date && datePattern.test(row.date)).map((row) => [row.date!, row]));
  const weightsByModel = new Map<string, Map<string, number>>();
  for (const row of input.dailyModelTokens ?? []) {
    if (!row.date || !datePattern.test(row.date)) continue;
    for (const [model, count] of Object.entries(row.tokensByModel ?? {})) {
      const weights = weightsByModel.get(model) ?? new Map<string, number>();
      weights.set(row.date, safeCount(count));
      weightsByModel.set(model, weights);
    }
  }
  const activityWeights = new Map([...activityByDate].map(([date, row]) => [date, Math.max(1, safeCount(row.messageCount))]));
  const components = new Map<string, { input: number; output: number; cacheCreation: number; cacheRead: number; combined: number; estimated: boolean; models: Record<string, number> }>();
  const component = (date: string) => {
    const existing = components.get(date);
    if (existing) return existing;
    const created = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, combined: 0, estimated: false, models: {} as Record<string, number> };
    components.set(date, created);
    return created;
  };
  const allocate = (total: number, weights: Map<string, number>) => {
    const eligible = [...weights].filter(([, weight]) => weight > 0);
    if (!eligible.length || total <= 0) return new Map<string, number>();
    const weightTotal = eligible.reduce((sum, [, weight]) => sum + weight, 0);
    const rows = eligible.map(([date, weight]) => {
      const exact = total * weight / weightTotal;
      return { date, count: Math.floor(exact), fraction: exact - Math.floor(exact) };
    });
    let remainder = Math.round(total) - rows.reduce((sum, row) => sum + row.count, 0);
    rows.sort((left, right) => right.fraction - left.fraction || left.date.localeCompare(right.date));
    for (let index = 0; remainder > 0; index = (index + 1) % rows.length, remainder -= 1) rows[index].count += 1;
    return new Map(rows.map((row) => [row.date, row.count]));
  };
  const seenModels = new Set<string>();
  for (const [model, usage] of Object.entries(input.modelUsage ?? {})) {
    seenModels.add(model);
    const weights = weightsByModel.get(model)?.size ? weightsByModel.get(model)! : activityWeights;
    const values = {
      input: safeCount(usage.inputTokens ?? usage.input_tokens),
      output: safeCount(usage.outputTokens ?? usage.output_tokens),
      cacheCreation: safeCount(usage.cacheCreationInputTokens ?? usage.cache_creation_input_tokens),
      cacheRead: safeCount(usage.cacheReadInputTokens ?? usage.cache_read_input_tokens),
    };
    const allocations = {
      input: allocate(values.input, weights),
      output: allocate(values.output, weights),
      cacheCreation: allocate(values.cacheCreation, weights),
      cacheRead: allocate(values.cacheRead, weights),
      combined: values.input + values.output > 0 ? new Map<string, number>() : new Map(weights),
    };
    for (const [name, allocation] of Object.entries(allocations) as Array<[keyof typeof allocations, Map<string, number>]>) {
      for (const [date, count] of allocation) {
        const current = component(date);
        current[name] += count;
        current.estimated = true;
        current.models[model] = (current.models[model] ?? 0) + count;
      }
    }
  }
  for (const [model, weights] of weightsByModel) {
    if (seenModels.has(model)) continue;
    for (const [date, count] of weights) {
      const current = component(date);
      current.combined += count;
      current.models[model] = (current.models[model] ?? 0) + count;
    }
  }
  const dates = new Set([...activityByDate.keys(), ...components.keys()]);
  const daily = [...dates].sort().map((date): DailyActivity => {
    const row = activityByDate.get(date) ?? {};
    const current = component(date);
    const tokens = current.input + current.output + current.cacheCreation + current.cacheRead + current.combined;
    const tokenProvenance: Provenance = current.estimated ? 'estimated' : 'local_exact';
    const tokenMetric = (name: MetricName, count: number) => metric(name, count, 'claude_code', tokenProvenance, date, tokenProvenance !== 'estimated');
    return {
      date,
      source: 'claude_code',
      category: 'coding',
      metrics: [
        metric('sessions', safeCount(row.sessionCount), 'claude_code', 'local_exact', date),
        metric('turns', safeCount(row.messageCount), 'claude_code', 'local_exact', date),
        metric('tool_calls', safeCount(row.toolCallCount), 'claude_code', 'local_exact', date),
        ...(tokens ? [tokenMetric('tokens', tokens), tokenMetric('input_tokens', current.input), tokenMetric('output_tokens', current.output), tokenMetric('cache_creation_input_tokens', current.cacheCreation), tokenMetric('cache_read_input_tokens', current.cacheRead)].filter((item) => item.value > 0) : []),
      ], models: current.models,
    };
  });
  if (!daily.length) warnings.push('Claude statistics contained no dated activity.');
  return { source: 'claude_code', daily, coverage: coverage('claude_code', daily.map((day) => day.date), 'local_exact', true, 'Cache-inclusive covered-period totals are preserved; stats-cache daily token splits are estimated and excluded from rankings. Lifetime coverage may still be partial.', 'partial'), warnings };
}

type ClaudeUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

type ClaudeSessionEvent = {
  timestamp?: string;
  sessionId?: string;
  session_id?: string;
  requestId?: string;
  message?: { id?: string; model?: string; content?: Array<{ type?: string }>; usage?: ClaudeUsage };
};

export function parseClaudeSessionLogs(text: string): AdapterResult {
  const warnings: string[] = [];
  const messages = new Map<string, { date: string; timestamp: string; model: string; tools: number; input: number; output: number; cacheCreation: number; cacheRead: number }>();
  const sessions = new Map<string, string>();
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let event: ClaudeSessionEvent;
    try { event = JSON.parse(line) as ClaudeSessionEvent; }
    catch { warnings.push(`Skipped malformed Claude JSONL record ${index + 1}.`); continue; }
    const sessionId = String(event.sessionId ?? event.session_id ?? '');
    const timestamp = typeof event.timestamp === 'string' ? event.timestamp : '';
    const date = timestamp.slice(0, 10);
    if (sessionId && datePattern.test(date) && (!sessions.has(sessionId) || date < sessions.get(sessionId)!)) sessions.set(sessionId, date);
    const usage = event.message?.usage;
    const messageId = String(event.message?.id ?? event.requestId ?? '');
    if (!sessionId || !messageId || !usage || !datePattern.test(date)) continue;
    const candidate = {
      date,
      timestamp,
      model: event.message?.model || 'unknown',
      tools: event.message?.content?.filter((block) => block?.type === 'tool_use').length ?? 0,
      input: safeCount(usage.input_tokens),
      output: safeCount(usage.output_tokens),
      cacheCreation: safeCount(usage.cache_creation_input_tokens),
      cacheRead: safeCount(usage.cache_read_input_tokens),
    };
    const key = `${sessionId}:${messageId}`;
    const existing = messages.get(key);
    const total = (item: typeof candidate) => item.input + item.output + item.cacheCreation + item.cacheRead;
    if (!existing || candidate.timestamp > existing.timestamp || (candidate.timestamp === existing.timestamp && total(candidate) > total(existing))) messages.set(key, candidate);
  }
  const rows = new Map<string, { sessions: number; turns: number; tools: number; input: number; output: number; cacheCreation: number; cacheRead: number; models: Record<string, number> }>();
  const row = (date: string) => {
    const existing = rows.get(date);
    if (existing) return existing;
    const created = { sessions: 0, turns: 0, tools: 0, input: 0, output: 0, cacheCreation: 0, cacheRead: 0, models: {} as Record<string, number> };
    rows.set(date, created);
    return created;
  };
  for (const date of sessions.values()) row(date).sessions += 1;
  for (const message of messages.values()) {
    const current = row(message.date);
    current.turns += 1; current.tools += message.tools; current.input += message.input; current.output += message.output; current.cacheCreation += message.cacheCreation; current.cacheRead += message.cacheRead;
    current.models[message.model] = (current.models[message.model] ?? 0) + message.input + message.output + message.cacheCreation + message.cacheRead;
  }
  const daily = [...rows.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, current]): DailyActivity => {
    const tokens = current.input + current.output + current.cacheCreation + current.cacheRead;
    const metrics: Array<[MetricName, number]> = [['sessions', current.sessions], ['turns', current.turns], ['tool_calls', current.tools], ['tokens', tokens], ['input_tokens', current.input], ['output_tokens', current.output], ['cache_creation_input_tokens', current.cacheCreation], ['cache_read_input_tokens', current.cacheRead]];
    return { date, source: 'claude_code', category: 'coding', metrics: metrics.filter(([, count]) => count > 0).map(([name, count]) => metric(name, count, 'claude_code', 'local_exact', date)), models: current.models };
  });
  return { source: 'claude_code', daily, coverage: coverage('claude_code', daily.map((day) => day.date), 'local_exact', true, 'Exact for retained session records; local retention cannot prove complete lifetime coverage.', 'partial'), warnings };
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
