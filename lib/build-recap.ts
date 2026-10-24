import type { ActivityDay } from './activity-window';
import type { DailyTokenRow } from './token-ledger';

const DAY = 86_400_000;
export type BuildRecap = {
  start: string;
  end: string;
  days: Array<{ date: string; active: boolean }>;
  activeDays: number;
  longestRun: number;
  tokenSources: number;
};

export function buildRecap(activity: ActivityDay[], tokens: DailyTokenRow[], now = Date.now()): BuildRecap {
  const end = new Date(now).toISOString().slice(0, 10);
  const endTime = Date.parse(end);
  const observed = new Set(activity.filter((day) => Number.isFinite(day.value) && day.value > 0).map((day) => day.date));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(endTime - (6 - index) * DAY).toISOString().slice(0, 10);
    return { date, active: observed.has(date) };
  });
  const dates = new Set(days.map((day) => day.date));
  const sources = new Set(tokens.filter((day) => dates.has(day.date)).flatMap((day) =>
    Object.entries(day.bySource).filter(([, value]) => Number.isFinite(value) && value > 0).map(([source]) => source)));
  let run = 0;
  let longestRun = 0;
  for (const day of days) {
    run = day.active ? run + 1 : 0;
    longestRun = Math.max(longestRun, run);
  }
  return { start: days[0].date, end, days, activeDays: days.filter((day) => day.active).length, longestRun, tokenSources: sources.size };
}
