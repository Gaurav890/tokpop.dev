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
  activeDays?: number;
};

export function compactMetric(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function buildProfileArchetype(input: ArchetypeInput): ProfileArchetype {
  const nonnegative = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const streak = Math.floor(nonnegative(input.currentStreak));
  const providers = Math.floor(nonnegative(input.providerCount));
  const calls = nonnegative(input.toolCalls);
  const days = Math.floor(nonnegative(input.activeDays ?? 0));
  const styles = {
    rhythm: [
      ['✨', 'Pocket Spark'], ['🌱', 'Build Sprout'], ['🛹', 'Flow Rider'],
      ['🎸', 'Rhythm Rockstar'], ['🌌', 'Orbit Maker'],
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
  const style = streak >= 7 ? 'streak' : providers >= 2 ? 'explorer' : calls >= 100 ? 'automation' : 'rhythm';
  const boundaries = style === 'streak' ? [14, 30, 60, 90]
    : style === 'explorer' ? [3, 4, 5, 6]
    : style === 'automation' ? [500, 2000, 10000, 50000] : [1, 7, 30, 90];
  const signal = style === 'streak' ? streak : style === 'explorer' ? providers : style === 'automation' ? calls : days;
  const stage = boundaries.filter((boundary) => signal >= boundary).length;
  const [emoji, title] = styles[style][stage];
  const personality = {
    rhythm: days > 0 ? `${days} recorded active days. You’re finding your own rhythm.` : 'Small spark. Big main-character energy. Your next build starts the story.',
    streak: `${streak} days straight. You brought the fire; the calendar kept receipts.`,
    explorer: `${providers} tools in your loadout. The whole band is here.`,
    automation: `${compactMetric(calls)} recorded tool calls. Your workflow has extra tentacles.`,
  }[style];
  return {
    emoji,
    title,
    summary: `${personality} Based on available activity, not token volume. A playful identity, not a skill rating.`,
  };
}
