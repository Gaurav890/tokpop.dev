import type { ProfileArchetype } from './profile-archetype';
import type { DailyTokenRow } from './token-ledger';

export type PublicProfile = {
  username: string;
  name: string;
  avatarUrl: string;
  verified: boolean;
  publicEnabled: boolean;
  score: number;
  scoreEligible: boolean;
  scoreReason?: string;
  scoreBreakdown: { consistency: number; workflowDepth: number; providerBreadth: number; delivery: number };
  rank: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  lifetimeTokens: number;
  tokenBreakdown: Array<{ source: string; label: string; tokens: number; provenance: string; components?: { input: number; output: number; cacheCreation: number; cacheRead: number; combinedOnly: number } }>;
  dailyTokens: DailyTokenRow[];
  sessions: number;
  activityTotals: { sessions: number; turns: number; toolCalls: number; skillUses: number; commandUses: number; agentRuns: number };
  archetype: ProfileArchetype;
  deliveryPoints: number;
  providers: string[];
  coverage: Array<{ source: string; label: string; provenance: string; status: string; completeness: string; note?: string }>;
  activity: Array<{ date: string; value: number }>;
  github: { commits: number; mergedPullRequests: number; reviews: number; releases: number };
  conversation: { sessions: number; activeDays: number; coverage: string };
  updatedAt: string;
};

const demoDailyTokens: DailyTokenRow[] = Array.from({ length: 61 }, (_, index) => {
  const codex = index === 60 ? 40_000_000 : 36_000_000;
  const claude = index === 60 ? 10_000_000 : 4_500_000;
  return {
    date: new Date(Date.UTC(2026, 8, 12 - index)).toISOString().slice(0, 10),
    total: codex + claude,
    bySource: { codex, claude_code: claude },
  };
});

export const demoProfile: PublicProfile = {
  username: 'demo',
  name: 'Example Profile',
  avatarUrl: '',
  verified: false,
  publicEnabled: true,
  score: 78,
  scoreEligible: true,
  scoreBreakdown: { consistency: 24, workflowDepth: 19, providerBreadth: 9, delivery: 26 },
  rank: 42,
  activeDays: 61,
  currentStreak: 41,
  longestStreak: 46,
  lifetimeTokens: 2_480_000_000,
  tokenBreakdown: [
    { source: 'codex', label: 'Codex', tokens: 2_200_000_000, provenance: 'Official account' },
    { source: 'claude_code', label: 'Claude Code', tokens: 280_000_000, provenance: 'Local exact', components: { input: 1_000_000, output: 19_000_000, cacheCreation: 40_000_000, cacheRead: 220_000_000, combinedOnly: 0 } },
  ],
  dailyTokens: demoDailyTokens,
  sessions: 684,
  activityTotals: { sessions: 684, turns: 8_420, toolCalls: 2_310, skillUses: 410, commandUses: 82, agentRuns: 39 },
  archetype: { emoji: '🥷', title: 'Token Ninja', summary: '2.5B tokens moved. 41 days straight. Quietly relentless.' },
  deliveryPoints: 172,
  providers: ['Codex', 'Claude Code', 'Cursor'],
  coverage: [
    { source: 'codex', label: 'Codex', provenance: 'Official account', status: 'Live', completeness: 'full' },
    { source: 'claude_code', label: 'Claude Code', provenance: 'Local exact', status: 'Partial', completeness: 'partial', note: 'Exact for retained session records; local retention cannot prove complete lifetime coverage.' },
    { source: 'cursor', label: 'Cursor', provenance: 'Local derived', status: 'Live', completeness: 'partial' },
    { source: 'chatgpt_web', label: 'ChatGPT Web', provenance: 'MCP observed', status: 'Partial', completeness: 'partial' },
  ],
  activity: Array.from({ length: 84 }, (_, index) => ({ date: new Date(Date.UTC(2026, 5, 17 + index)).toISOString().slice(0, 10), value: ((index * 7 + Math.floor(index / 12) * 3) % 11) > 6 ? 4 : ((index * 7) % 5) })),
  github: { commits: 118, mergedPullRequests: 12, reviews: 6, releases: 1 },
  conversation: { sessions: 32, activeDays: 18, coverage: 'Partial and excluded from ranking' },
  updatedAt: '2026-09-12T18:00:00.000Z',
};
