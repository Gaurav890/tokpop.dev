export function publicConversationRows<T extends { source: string }>(rows: T[], enabled: boolean): T[] {
  if (!enabled) return [];
  return rows.filter((row) => row.source === 'chatgpt_web' || row.source === 'claude_web');
}
