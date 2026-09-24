const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function safeCount(value) {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function metric(name, value, date, provenance = 'local_exact') {
  return {
    name,
    value,
    unit: 'count',
    provenance,
    source: 'claude_code',
    coverageStart: date,
    coverageEnd: date,
    competitiveEligible: provenance !== 'estimated',
  };
}

function usageValue(usage, snakeName, camelName) {
  return safeCount(usage?.[snakeName] ?? usage?.[camelName]);
}

function normalizeUsage(usage) {
  return {
    inputTokens: usageValue(usage, 'input_tokens', 'inputTokens'),
    outputTokens: usageValue(usage, 'output_tokens', 'outputTokens'),
    cacheCreationInputTokens: usageValue(usage, 'cache_creation_input_tokens', 'cacheCreationInputTokens'),
    cacheReadInputTokens: usageValue(usage, 'cache_read_input_tokens', 'cacheReadInputTokens'),
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

export function addClaudeSessionEvent(accumulator, event, context = {}) {
  if (!event || typeof event !== 'object') return;
  const sessionId = String(event.sessionId ?? event.session_id ?? context.sessionId ?? '');
  const rawTimestamp = event.timestamp ?? event.created_at ?? event.createdAt ?? event.message?.timestamp;
  const timestamp = typeof rawTimestamp === 'string'
    ? rawTimestamp
    : Number.isFinite(rawTimestamp) ? new Date(rawTimestamp).toISOString() : '';
  const date = timestamp.slice(0, 10);
  if (sessionId && datePattern.test(date)) {
    const existing = accumulator.sessionStarts.get(sessionId);
    if (!existing || date < existing) accumulator.sessionStarts.set(sessionId, date);
  }

  const message = event.message;
  const rawUsage = message?.usage;
  if (!message || !rawUsage || !sessionId || !datePattern.test(date)) return;
  const messageId = String(message.id ?? event.requestId ?? event.request_id ?? event.uuid ?? context.recordId ?? '');
  if (!messageId) return;

  const usage = normalizeUsage(rawUsage);
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

function allocateInteger(total, weights) {
  const entries = [...weights.entries()].filter(([, value]) => value > 0);
  if (!entries.length || total <= 0) return new Map();
  const weightTotal = entries.reduce((sum, [, value]) => sum + value, 0);
  const rows = entries.map(([key, weight]) => {
    const exact = total * weight / weightTotal;
    return { key, value: Math.floor(exact), fraction: exact - Math.floor(exact) };
  });
  let remainder = Math.round(total) - rows.reduce((sum, row) => sum + row.value, 0);
  rows.sort((left, right) => right.fraction - left.fraction || String(left.key).localeCompare(String(right.key)));
  for (let index = 0; remainder > 0; index = (index + 1) % rows.length, remainder -= 1) rows[index].value += 1;
  return new Map(rows.map(({ key, value }) => [key, value]));
}

function addAllocation(target, allocation) {
  for (const [date, value] of allocation) target.set(date, (target.get(date) ?? 0) + value);
}

export function parseClaudeStatsCache(stats) {
  if (!stats || typeof stats !== 'object') return { daily: [], estimatedCacheTokens: 0, undatedCacheTokens: 0, estimatedDates: 0 };
  const activityByDate = new Map((stats.dailyActivity ?? []).filter((item) => datePattern.test(item?.date ?? '')).map((item) => [item.date, item]));
  const modelWeights = new Map();
  for (const item of stats.dailyModelTokens ?? []) {
    if (!datePattern.test(item?.date ?? '')) continue;
    for (const [model, value] of Object.entries(item.tokensByModel ?? {})) {
      const weights = modelWeights.get(model) ?? new Map();
      weights.set(item.date, safeCount(value));
      modelWeights.set(model, weights);
    }
  }
  const activityWeights = new Map([...activityByDate].map(([date, activity]) => [date, Math.max(1, safeCount(activity.messageCount))]));
  const dates = new Set([...activityByDate.keys(), ...[...modelWeights.values()].flatMap((weights) => [...weights.keys()])]);
  const componentsByDate = new Map();
  const modelsByDate = new Map();
  const componentRow = (date) => {
    const current = componentsByDate.get(date) ?? { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, combined: 0, estimated: false };
    componentsByDate.set(date, current);
    dates.add(date);
    return current;
  };
  const addModelAllocation = (model, allocation) => {
    for (const [date, value] of allocation) {
      const models = modelsByDate.get(date) ?? {};
      models[model] = (models[model] ?? 0) + value;
      modelsByDate.set(date, models);
    }
  };
  let estimatedCacheTokens = 0;
  const seenModels = new Set();
  for (const [model, rawUsage] of Object.entries(stats.modelUsage ?? {})) {
    seenModels.add(model);
    const usage = normalizeUsage(rawUsage);
    const weights = modelWeights.get(model)?.size ? modelWeights.get(model) : activityWeights;
    if (!weights.size) continue;
    const input = allocateInteger(usage.inputTokens, weights);
    const output = allocateInteger(usage.outputTokens, weights);
    const cacheCreation = allocateInteger(usage.cacheCreationInputTokens, weights);
    const cacheRead = allocateInteger(usage.cacheReadInputTokens, weights);
    const combined = usage.inputTokens + usage.outputTokens > 0 ? new Map() : new Map(weights);
    for (const [date, value] of input) { componentRow(date).input += value; componentRow(date).estimated = true; }
    for (const [date, value] of output) { componentRow(date).output += value; componentRow(date).estimated = true; }
    for (const [date, value] of cacheCreation) { componentRow(date).cacheCreation += value; componentRow(date).estimated = true; }
    for (const [date, value] of cacheRead) { componentRow(date).cacheRead += value; componentRow(date).estimated = true; }
    for (const [date, value] of combined) { componentRow(date).combined += value; componentRow(date).estimated = true; }
    const modelTotal = new Map();
    addAllocation(modelTotal, input); addAllocation(modelTotal, output); addAllocation(modelTotal, cacheCreation); addAllocation(modelTotal, cacheRead); addAllocation(modelTotal, combined);
    addModelAllocation(model, modelTotal);
    estimatedCacheTokens += usage.cacheCreationInputTokens + usage.cacheReadInputTokens;
  }
  for (const [model, weights] of modelWeights) {
    if (seenModels.has(model)) continue;
    for (const [date, value] of weights) {
      componentRow(date).combined += value;
      addModelAllocation(model, new Map([[date, value]]));
    }
  }
  const orderedDates = [...dates].sort();
  const daily = orderedDates.map((date) => {
    const activity = activityByDate.get(date) ?? {};
    const components = componentsByDate.get(date) ?? { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, combined: 0, estimated: false };
    const tokens = components.input + components.output + components.cacheCreation + components.cacheRead + components.combined;
    const tokenProvenance = components.estimated ? 'estimated' : 'local_exact';
    const values = [
      ['sessions', safeCount(activity.sessionCount), 'local_exact'],
      ['turns', safeCount(activity.messageCount), 'local_exact'],
      ['tool_calls', safeCount(activity.toolCallCount), 'local_exact'],
      ['tokens', tokens, tokenProvenance],
      ['input_tokens', components.input, tokenProvenance],
      ['output_tokens', components.output, tokenProvenance],
      ['cache_creation_input_tokens', components.cacheCreation, tokenProvenance],
      ['cache_read_input_tokens', components.cacheRead, tokenProvenance],
    ];
    return { date, source: 'claude_code', category: 'coding', metrics: values.filter(([, value]) => value > 0).map(([name, value, provenance]) => metric(name, value, date, provenance)), models: modelsByDate.get(date) };
  });
  return { daily, estimatedCacheTokens, undatedCacheTokens: estimatedCacheTokens, estimatedDates: daily.filter((day) => day.metrics.some((item) => item.name === 'tokens' && item.provenance === 'estimated')).length };
}

export function mergeClaudeUsage(sessionDaily, legacyDaily) {
  const merged = new Map(legacyDaily.map((day) => [day.date, day]));
  for (const day of sessionDaily) merged.set(day.date, day);
  return [...merged.values()].sort((left, right) => left.date.localeCompare(right.date));
}
