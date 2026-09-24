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
