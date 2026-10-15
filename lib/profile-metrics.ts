export type ProfileMetricRow = {
  date: string;
  source: string;
  metric_name: string;
  value: number;
  provenance: string;
  competitive_eligible: number;
};

const TOKEN_METRICS = new Set([
  'tokens',
  'input_tokens',
  'output_tokens',
  'cache_creation_input_tokens',
  'cache_read_input_tokens',
]);

const provenancePriority: Record<string, number> = {
  official_account_api: 6,
  local_exact: 5,
  local_derived: 4,
  estimated: 3,
  official_export: 2,
  mcp_observed: 1,
};

/**
 * A collector upgrade can change the provenance used for the same source/day.
 * The database intentionally retains both records for auditability, so the
 * read model must select one instead of adding overlapping totals together.
 */
export function resolveTokenMetrics(rows: ProfileMetricRow[]): ProfileMetricRow[] {
  const selected = new Map<string, ProfileMetricRow>();
  for (const row of rows) {
    if (!TOKEN_METRICS.has(row.metric_name) || row.value < 0) continue;
    const key = `${row.date}\u0000${row.source}\u0000${row.metric_name}`;
    const current = selected.get(key);
    if (!current
      || row.provenance === 'official_account_api'
      || (current.provenance !== 'official_account_api' && row.value > current.value)
      || (current.provenance !== 'official_account_api'
        && row.value === current.value
        && (provenancePriority[row.provenance] ?? 0) > (provenancePriority[current.provenance] ?? 0))) {
      selected.set(key, row);
    }
  }
  return [...selected.values()];
}

export function tokenComponents(rows: ProfileMetricRow[]) {
  const result = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, combinedOnly: 0 };
  for (const total of rows.filter((row) => row.metric_name === 'tokens')) {
    const sameDay = rows.filter((row) => row.date === total.date && row.source === total.source && row.provenance === total.provenance);
    const value = (name: string) => sameDay.find((row) => row.metric_name === name)?.value ?? 0;
    const parts = { input: value('input_tokens'), output: value('output_tokens'), cacheCreation: value('cache_creation_input_tokens'), cacheRead: value('cache_read_input_tokens') };
    const classified = Object.values(parts).reduce((sum, count) => sum + count, 0);
    if (classified > total.value || Object.values(parts).some((count) => !Number.isFinite(count) || count < 0)) {
      result.combinedOnly += total.value;
      continue;
    }
    for (const key of Object.keys(parts) as Array<keyof typeof parts>) result[key] += parts[key];
    result.combinedOnly += total.value - classified;
  }
  return result;
}
