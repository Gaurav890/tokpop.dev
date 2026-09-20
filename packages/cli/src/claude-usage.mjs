const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function safeCount(value) {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function metric(name, value, date) {
  return {
    name,
    value,
    unit: 'count',
    provenance: 'local_exact',
    source: 'claude_code',
    coverageStart: date,
    coverageEnd: date,
    competitiveEligible: true,
  };
}

function usageTotal(usage) {
  return safeCount(usage.inputTokens)
    + safeCount(usage.outputTokens)
    + safeCount(usage.cacheCreationInputTokens)
    + safeCount(usage.cacheReadInputTokens);
}

export function createClaudeSessionAccumulator() {
  return { messages: new Map(), sessionStarts: new Map(), warnings: [] };
}

export function addClaudeSessionEvent(accumulator, event) {
  if (!event || typeof event !== 'object') return;
  const sessionId = String(event.sessionId ?? event.session_id ?? '');
  const timestamp = typeof event.timestamp === 'string' ? event.timestamp : '';
  const date = timestamp.slice(0, 10);
  if (sessionId && datePattern.test(date)) {
    const existing = accumulator.sessionStarts.get(sessionId);
    if (!existing || date < existing) accumulator.sessionStarts.set(sessionId, date);
  }

  const message = event.message;
  const rawUsage = message?.usage;
  if (!message || !rawUsage || !sessionId || !datePattern.test(date)) return;
  const messageId = String(message.id ?? event.requestId ?? '');
  if (!messageId) return;

  const usage = {
    inputTokens: safeCount(rawUsage.input_tokens),
    outputTokens: safeCount(rawUsage.output_tokens),
    cacheCreationInputTokens: safeCount(rawUsage.cache_creation_input_tokens),
    cacheReadInputTokens: safeCount(rawUsage.cache_read_input_tokens),
  };
  const candidate = {
    date,
    timestamp,
    model: typeof message.model === 'string' && message.model ? message.model : 'unknown',
    toolCalls: Array.isArray(message.content) ? message.content.filter((block) => block?.type === 'tool_use').length : 0,
    usage,
  };
  const key = `${sessionId}:${messageId}`;
  const existing = accumulator.messages.get(key);
  const candidateTotal = usageTotal(candidate.usage);
  const existingTotal = existing ? usageTotal(existing.usage) : -1;
  if (!existing || candidate.timestamp > existing.timestamp || (candidate.timestamp === existing.timestamp && candidateTotal > existingTotal)) {
    accumulator.messages.set(key, candidate);
  }
}

export function finalizeClaudeSessionUsage(accumulator) {
  const rows = new Map();
  const row = (date) => {
    const existing = rows.get(date);
    if (existing) return existing;
    const created = { sessions: 0, turns: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0, models: {} };
    rows.set(date, created);
    return created;
  };

  for (const date of accumulator.sessionStarts.values()) row(date).sessions += 1;
  for (const message of accumulator.messages.values()) {
    const current = row(message.date);
    current.turns += 1;
    current.toolCalls += message.toolCalls;
    current.inputTokens += message.usage.inputTokens;
    current.outputTokens += message.usage.outputTokens;
    current.cacheCreationInputTokens += message.usage.cacheCreationInputTokens;
    current.cacheReadInputTokens += message.usage.cacheReadInputTokens;
    current.models[message.model] = (current.models[message.model] ?? 0) + usageTotal(message.usage);
  }

  const daily = [...rows.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, current]) => {
    const tokens = current.inputTokens + current.outputTokens + current.cacheCreationInputTokens + current.cacheReadInputTokens;
    const values = [
      ['sessions', current.sessions],
      ['turns', current.turns],
      ['tool_calls', current.toolCalls],
      ['tokens', tokens],
      ['input_tokens', current.inputTokens],
      ['output_tokens', current.outputTokens],
      ['cache_creation_input_tokens', current.cacheCreationInputTokens],
      ['cache_read_input_tokens', current.cacheReadInputTokens],
    ];
    return {
      date,
      source: 'claude_code',
      category: 'coding',
      metrics: values.filter(([, value]) => value > 0).map(([name, value]) => metric(name, value, date)),
      models: current.models,
    };
  });
  return { daily, messageCount: accumulator.messages.size, warnings: accumulator.warnings };
}

export function parseClaudeStatsCache(stats) {
  if (!stats || typeof stats !== 'object') return { daily: [], undatedCacheTokens: 0 };
  const activityByDate = new Map((stats.dailyActivity ?? []).filter((item) => datePattern.test(item?.date ?? '')).map((item) => [item.date, item]));
  const tokensByDate = new Map((stats.dailyModelTokens ?? []).filter((item) => datePattern.test(item?.date ?? '')).map((item) => [item.date, Object.values(item.tokensByModel ?? {}).reduce((sum, value) => sum + safeCount(value), 0)]));
  const dates = [...new Set([...activityByDate.keys(), ...tokensByDate.keys()])].sort();
  const daily = dates.map((date) => {
    const activity = activityByDate.get(date) ?? {};
    const values = [
      ['sessions', safeCount(activity.sessionCount)],
      ['turns', safeCount(activity.messageCount)],
      ['tool_calls', safeCount(activity.toolCallCount)],
      ['tokens', safeCount(tokensByDate.get(date))],
    ];
    return { date, source: 'claude_code', category: 'coding', metrics: values.filter(([, value]) => value > 0).map(([name, value]) => metric(name, value, date)) };
  });
  const modelUsage = Object.values(stats.modelUsage ?? {});
  const undatedCacheTokens = modelUsage.reduce((sum, usage) => sum + safeCount(usage?.cacheReadInputTokens) + safeCount(usage?.cacheCreationInputTokens), 0);
  return { daily, undatedCacheTokens };
}

export function mergeClaudeUsage(sessionDaily, legacyDaily) {
  const merged = new Map(legacyDaily.map((day) => [day.date, day]));
  for (const day of sessionDaily) merged.set(day.date, day);
  return [...merged.values()].sort((left, right) => left.date.localeCompare(right.date));
}
