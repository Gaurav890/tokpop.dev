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
  if (input.tokens >= 1_000_000_000) {
    return {
      emoji: '🥷',
      title: 'Token Ninja',
      summary: `${compactMetric(input.tokens)} tokens moved. ${input.currentStreak} days straight. Quietly relentless.`,
    };
  }
  if (input.currentStreak >= 30) {
    return {
      emoji: '🔥',
      title: 'Streak Machine',
      summary: `${input.currentStreak} days straight. The system is still warm.`,
    };
  }
  if (input.deliveryPoints >= 100) {
    return {
      emoji: '🚀',
      title: 'Ship Captain',
      summary: `${input.deliveryPoints} delivery points. Ideas keep reaching production.`,
    };
  }
  if (input.providerCount >= 3) {
    return {
      emoji: '🧠',
      title: 'Model Wrangler',
      summary: `${input.providerCount} tools in the loadout. One builder at the controls.`,
    };
  }
  if (input.toolCalls >= 100) {
    return {
      emoji: '🛠️',
      title: 'Toolsmith',
      summary: `${compactMetric(input.toolCalls)} recorded tool calls and a workflow built to use them.`,
    };
  }
  return {
    emoji: '⚡',
    title: 'Workflow Builder',
    summary: 'Turning ideas into momentum, one active day at a time.',
  };
}
