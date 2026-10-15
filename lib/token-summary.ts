type Components = { input: number; output: number; cacheCreation: number; cacheRead: number; combinedOnly: number };
type TokenProvider = { tokens: number; components?: Components };

export function summarizeTokens(providers: TokenProvider[]) {
  const summary = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, unclassified: 0 };
  for (const provider of providers) {
    const c = provider.components;
    const values = c ? [c.input, c.output, c.cacheCreation, c.cacheRead] : [];
    const classified = values.reduce((sum, value) => sum + value, 0);
    if (!c || values.some((value) => !Number.isFinite(value) || value < 0) || classified > provider.tokens) {
      summary.unclassified += provider.tokens;
      continue;
    }
    summary.input += c.input;
    summary.output += c.output;
    summary.cacheCreation += c.cacheCreation;
    summary.cacheRead += c.cacheRead;
    summary.unclassified += provider.tokens - classified;
  }
  return summary;
}
