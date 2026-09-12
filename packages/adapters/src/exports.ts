import type { SourceSurface } from '@ai-native-profile/schema';

export type ExportAggregate = {
  source: Extract<SourceSurface, 'chatgpt_web' | 'claude_web'>;
  days: Array<{ date: string; sessions: number; turns: number }>;
  coverageStart: string;
  coverageEnd: string;
};

function toDate(value: unknown): string | null {
  const timestamp = typeof value === 'number' && value < 10_000_000_000 ? value * 1000 : value;
  const date = new Date(timestamp as string | number);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function parseConversationExport(source: ExportAggregate['source'], value: unknown): ExportAggregate {
  if (!Array.isArray(value)) throw new Error('Expected an array of exported conversations.');
  const totals = new Map<string, { sessions: number; turns: number }>();
  for (const item of value as Array<Record<string, unknown>>) {
    const createdAt = source === 'chatgpt_web' ? item.create_time : item.created_at ?? item.createdAt;
    const date = toDate(createdAt);
    if (!date) continue;
    let turns = 0;
    if (source === 'chatgpt_web' && item.mapping && typeof item.mapping === 'object') {
      turns = Object.values(item.mapping as Record<string, unknown>).filter((node) => node && typeof node === 'object' && 'message' in (node as object) && (node as { message?: unknown }).message).length;
    } else if (Array.isArray(item.chat_messages)) turns = item.chat_messages.length;
    else if (Array.isArray(item.messages)) turns = item.messages.length;
    const current = totals.get(date) ?? { sessions: 0, turns: 0 };
    current.sessions += 1;
    current.turns += turns;
    totals.set(date, current);
  }
  const days = [...totals.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, counts]) => ({ date, ...counts }));
  if (!days.length) throw new Error('No dated conversations were found in this export.');
  return { source, days, coverageStart: days[0].date, coverageEnd: days.at(-1)!.date };
}
