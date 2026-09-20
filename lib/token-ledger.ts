export type DailyTokenRow = {
  date: string;
  total: number;
  bySource: Record<string, number>;
};

type TokenMetric = {
  date: string;
  source: string;
  value: number;
};

export function buildDailyTokenLedger(rows: TokenMetric[]): DailyTokenRow[] {
  const days = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (row.value <= 0) continue;
    const sources = days.get(row.date) ?? new Map<string, number>();
    sources.set(row.source, (sources.get(row.source) ?? 0) + row.value);
    days.set(row.date, sources);
  }
  return [...days.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, sources]) => {
      const bySource = Object.fromEntries(sources);
      return { date, bySource, total: Object.values(bySource).reduce((sum, value) => sum + value, 0) };
    });
}
