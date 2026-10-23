export type ProfileArchetype = {
  emoji: string;
  title: string;
  summary: string;
};

type ArchetypeInput = {
  tokens: number;
  currentStreak: number;
  providerCount: number;
  deliveryPoints: number;
  toolCalls: number;
};

export function compactMetric(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function buildProfileArchetype(input: ArchetypeInput): ProfileArchetype {
  const nonnegative = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const tokens = nonnegative(input.tokens);
  const streak = Math.floor(nonnegative(input.currentStreak));
  const providers = Math.floor(nonnegative(input.providerCount));
  const calls = nonnegative(input.toolCalls);
  const stage = tokens >= 5e9 ? 4 : tokens >= 1e9 ? 3 : tokens >= 100e6 ? 2 : tokens >= 1e6 ? 1 : 0;
  const styles = {
    tokens: [
      ['✨', 'Pocket Spark'], ['🐸', 'Token Tadpole'], ['👾', 'Token Goblin'],
      ['☄️', 'Token Comet'], ['🌌', 'Token Supernova'],
    ],
    streak: [
      ['🔥', 'Spark Keeper'], ['🌱', 'Streak Sprout'], ['🧚', 'Streak Sprite'],
      ['🐉', 'Streak Dragon'], ['🦅', 'Cosmic Phoenix'],
    ],
    explorer: [
      ['🧭', 'Tool Scout'], ['🤹', 'Tool Juggler'], ['🎧', 'Model DJ'],
      ['🧙', 'Stack Sorcerer'], ['🪐', 'Galaxy Wrangler'],
    ],
    automation: [
      ['🔧', 'Button Sprite'], ['👹', 'Macro Gremlin'], ['🛠️', 'Tool Tinkerer'],
      ['🪄', 'Workflow Wizard'], ['🐙', 'Automation Kraken'],
    ],
  } as const;
  const style = streak >= 30 ? 'streak' : providers >= 3 ? 'explorer' : calls >= 100 ? 'automation' : 'tokens';
  const [emoji, title] = styles[style][stage];
  const personality = {
    tokens: tokens > 0 ? 'A little cosmic chaos in the token counter.' : 'Small spark. Big main-character energy. Connect a tool to begin.',
    streak: `${streak} days straight. You brought the fire; the calendar kept receipts.`,
    explorer: `${providers} tools in your loadout. The whole band is here.`,
    automation: `${compactMetric(calls)} recorded tool calls. Your workflow has extra tentacles.`,
  }[style];
  return {
    emoji,
    title,
    summary: `${personality} ${compactMetric(tokens)} recorded tokens, including reported cache usage. A playful identity, not a skill rating.`,
  };
}
