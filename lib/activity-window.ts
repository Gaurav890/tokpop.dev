export type ActivityDay = { date: string; value: number };
export type ActivityRange = '12w' | '6m' | 'year';
const DAY = 86_400_000;
const iso = (value: number) => new Date(value).toISOString().slice(0, 10);

export function buildActivityHistory(byDate: Map<string, number>, now = Date.now()): ActivityDay[] {
  const end = Date.parse(iso(now));
  return Array.from({ length: 365 }, (_, index) => {
    const date = iso(end - (364 - index) * DAY);
    return { date, value: Math.min(4, Math.max(0, byDate.get(date) ?? 0)) };
  });
}

export function activityWindow(activity: ActivityDay[], range: ActivityRange) {
  const sorted = activity.filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && Number.isFinite(Date.parse(day.date))).toSorted((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return null;
  const end = Date.parse(sorted.at(-1)!.date);
  let start = end - (range === '12w' ? 83 : 364) * DAY;
  if (range === '6m') {
    const date = new Date(end);
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - 6);
    const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, last));
    start = date.getTime() + DAY;
  }
  const lookup = new Map(sorted.map((day) => [day.date, day.value]));
  const days = Array.from({ length: Math.round((end - start) / DAY) + 1 }, (_, index) => {
    const date = iso(start + index * DAY);
    return { date, value: lookup.get(date) ?? null };
  });
  const leading = (new Date(start).getUTCDay() + 6) % 7;
  const trailing = (7 - (leading + days.length) % 7) % 7;
  return { start: iso(start), end: iso(end), days, leading, trailing,
    activeDays: days.filter((day) => day.value !== null && day.value > 0).length,
    missingDays: days.filter((day) => day.value === null).length };
}
