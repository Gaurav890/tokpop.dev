export const SOURCE_SURFACES = [
  'codex',
  'claude_code',
  'cursor',
  'gemini_cli',
  'copilot_cli',
  'chatgpt_web',
  'claude_web',
  'github',
] as const;

export type SourceSurface = (typeof SOURCE_SURFACES)[number];

export const PROVENANCE_VALUES = [
  'official_account_api',
  'official_export',
  'local_exact',
  'local_derived',
  'mcp_observed',
  'estimated',
] as const;

export type Provenance = (typeof PROVENANCE_VALUES)[number];
export type Completeness = 'full' | 'partial' | 'unknown';
export type ActivityCategory = 'coding' | 'conversation' | 'delivery';

export type MetricName =
  | 'tokens'
  | 'input_tokens'
  | 'output_tokens'
  | 'cache_creation_input_tokens'
  | 'cache_read_input_tokens'
  | 'sessions'
  | 'turns'
  | 'tool_calls'
  | 'tool_using_sessions'
  | 'advanced_workflow_sessions'
  | 'skill_uses'
  | 'command_uses'
  | 'agent_runs'
  | 'duration_seconds'
  | 'commits'
  | 'pull_requests'
  | 'merged_pull_requests'
  | 'reviews'
  | 'private_contributions'
  | 'releases';

export type MetricValue = {
  name: MetricName;
  value: number;
  unit: string;
  provenance: Provenance;
  source: SourceSurface;
  coverageStart: string;
  coverageEnd: string;
  competitiveEligible: boolean;
};

export type DailyActivity = {
  date: string;
  source: SourceSurface;
  category: ActivityCategory;
  metrics: MetricValue[];
  models?: Record<string, number>;
  tools?: Record<string, number>;
  skills?: Record<string, number>;
};

export type SourceCoverage = {
  source: SourceSurface;
  coverageStart: string;
  coverageEnd: string;
  lastSyncedAt: string;
  completeness: Completeness;
  competitiveEligible: boolean;
  note?: string;
};

export type ActivityBatch = {
  schemaVersion: 'anp.activity.v1';
  batchId: string;
  deviceId: string;
  generatedAt: string;
  collectorVersion: string;
  daily: DailyActivity[];
  coverage: SourceCoverage[];
  signature: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T/;
const METRIC_NAMES: MetricName[] = ['tokens', 'input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'sessions', 'turns', 'tool_calls', 'tool_using_sessions', 'advanced_workflow_sessions', 'skill_uses', 'command_uses', 'agent_runs', 'duration_seconds', 'commits', 'pull_requests', 'merged_pull_requests', 'reviews', 'private_contributions', 'releases'];
const CATEGORIES: ActivityCategory[] = ['coding', 'conversation', 'delivery'];

export function competitiveEligible(source: SourceSurface, provenance: Provenance): boolean {
  return !['chatgpt_web', 'claude_web'].includes(source) && !['official_export', 'mcp_observed', 'estimated'].includes(provenance);
}

export function isSourceSurface(value: unknown): value is SourceSurface {
  return typeof value === 'string' && SOURCE_SURFACES.includes(value as SourceSurface);
}

export function validateActivityBatch(value: unknown): { ok: true; value: ActivityBatch } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') return { ok: false, errors: ['Batch must be an object.'] };
  const batch = value as Partial<ActivityBatch>;
  if (batch.schemaVersion !== 'anp.activity.v1') errors.push('Unsupported schemaVersion.');
  if (!batch.batchId || typeof batch.batchId !== 'string') errors.push('batchId is required.');
  if (!batch.deviceId || typeof batch.deviceId !== 'string') errors.push('deviceId is required.');
  if (!batch.generatedAt || !ISO_DATETIME.test(batch.generatedAt)) errors.push('generatedAt must be ISO-8601.');
  if (!Array.isArray(batch.daily)) errors.push('daily must be an array.');
  if (!Array.isArray(batch.coverage)) errors.push('coverage must be an array.');
  if ((batch.daily?.length ?? 0) > 10_000) errors.push('daily exceeds the 10,000 row limit.');
  if (!batch.signature || typeof batch.signature !== 'string') errors.push('signature is required.');
  for (const [index, day] of (batch.daily ?? []).entries()) {
    if (!ISO_DATE.test(day.date)) errors.push(`daily[${index}].date must be YYYY-MM-DD.`);
    if (!isSourceSurface(day.source)) errors.push(`daily[${index}].source is unsupported.`);
    if (!CATEGORIES.includes(day.category)) errors.push(`daily[${index}].category is unsupported.`);
    if (!Array.isArray(day.metrics)) errors.push(`daily[${index}].metrics must be an array.`);
    if ((day.metrics?.length ?? 0) > 100) errors.push(`daily[${index}] exceeds the metric limit.`);
    for (const [metricIndex, metric] of (day.metrics ?? []).entries()) {
      if (!Number.isFinite(metric.value) || metric.value < 0) errors.push(`daily[${index}] has an invalid metric value.`);
      if (!METRIC_NAMES.includes(metric.name)) errors.push(`daily[${index}].metrics[${metricIndex}].name is unsupported.`);
      if (!PROVENANCE_VALUES.includes(metric.provenance)) errors.push(`daily[${index}].metrics[${metricIndex}].provenance is unsupported.`);
      if (!isSourceSurface(metric.source) || metric.source !== day.source) errors.push(`daily[${index}].metrics[${metricIndex}].source must match its day.`);
      if (!ISO_DATE.test(metric.coverageStart) || !ISO_DATE.test(metric.coverageEnd)) errors.push(`daily[${index}].metrics[${metricIndex}] has invalid coverage dates.`);
      if (metric.competitiveEligible && isSourceSurface(metric.source) && PROVENANCE_VALUES.includes(metric.provenance) && !competitiveEligible(metric.source, metric.provenance)) errors.push(`daily[${index}].metrics[${metricIndex}] is not eligible for competition.`);
    }
  }
  for (const [index, item] of (batch.coverage ?? []).entries()) {
    if (!isSourceSurface(item.source)) errors.push(`coverage[${index}].source is unsupported.`);
    if (!ISO_DATE.test(item.coverageStart) || !ISO_DATE.test(item.coverageEnd)) errors.push(`coverage[${index}] has invalid dates.`);
    if (!item.lastSyncedAt || !ISO_DATETIME.test(item.lastSyncedAt)) errors.push(`coverage[${index}].lastSyncedAt must be ISO-8601.`);
    if (!['full', 'partial', 'unknown'].includes(item.completeness)) errors.push(`coverage[${index}].completeness is unsupported.`);
    if (item.competitiveEligible && ['chatgpt_web', 'claude_web'].includes(item.source)) errors.push(`coverage[${index}] is not eligible for competition.`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: batch as ActivityBatch };
}

export function publicProjection(batch: ActivityBatch): ActivityBatch {
  return {
    ...batch,
    daily: batch.daily.map((day) => ({
      ...day,
      models: day.models ? Object.fromEntries(Object.entries(day.models).filter(([, count]) => Number.isFinite(count) && count >= 0)) : undefined,
      tools: day.tools ? Object.fromEntries(Object.entries(day.tools).filter(([, count]) => Number.isFinite(count) && count >= 0)) : undefined,
      skills: day.skills ? Object.fromEntries(Object.entries(day.skills).filter(([, count]) => Number.isFinite(count) && count >= 0)) : undefined,
    })),
  };
}
