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
  sessions: number;
  deliveryPoints: number;
  providers: string[];
  coverage: Array<{ source: string; label: string; provenance: string; status: string; completeness: string }>;
  activity: Array<{ date: string; value: number }>;
  github: { commits: number; mergedPullRequests: number; reviews: number; releases: number };
  conversation: { sessions: number; activeDays: number; coverage: string };
  updatedAt: string;
};

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
  sessions: 684,
  deliveryPoints: 172,
  providers: ['Codex', 'Claude Code', 'Cursor'],
  coverage: [
    { source: 'codex', label: 'Codex', provenance: 'Official account', status: 'Live', completeness: 'full' },
    { source: 'claude_code', label: 'Claude Code', provenance: 'Local exact', status: 'Live', completeness: 'full' },
    { source: 'cursor', label: 'Cursor', provenance: 'Local derived', status: 'Live', completeness: 'partial' },
    { source: 'chatgpt_web', label: 'ChatGPT Web', provenance: 'MCP observed', status: 'Partial', completeness: 'partial' },
  ],
  activity: Array.from({ length: 84 }, (_, index) => ({ date: new Date(Date.UTC(2026, 5, 17 + index)).toISOString().slice(0, 10), value: ((index * 7 + Math.floor(index / 12) * 3) % 11) > 6 ? 4 : ((index * 7) % 5) })),
  github: { commits: 118, mergedPullRequests: 12, reviews: 6, releases: 1 },
  conversation: { sessions: 32, activeDays: 18, coverage: 'Partial and excluded from ranking' },
  updatedAt: '2026-09-12T18:00:00.000Z',
};
