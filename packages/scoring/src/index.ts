export type ScoreInput = {
  githubConnected: boolean;
  coveredDays: number;
  activeCodingDays90: number;
  longestStreak90: number;
  toolUsingSessionRate: number;
  toolCallsPerSession: number;
  advancedWorkflowSessionRate: number;
  activeCodingProviders: number;
  commits: number;
  mergedPullRequests: number;
  reviews: number;
  releases: number;
};

export type ScoreBreakdown = {
  eligible: boolean;
  reason?: string;
  total: number | null;
  consistency: number;
  workflowDepth: number;
  providerBreadth: number;
  delivery: number;
  deliveryPoints: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const round = (value: number) => Math.round(value * 10) / 10;

export function calculateWorkflowIndex(input: ScoreInput): ScoreBreakdown {
  const consistency =
    20 * clamp01(input.activeCodingDays90 / 45) +
    10 * clamp01(input.longestStreak90 / 14);
  const workflowDepth =
    10 * clamp01(input.toolUsingSessionRate / 0.8) +
    8 * clamp01(input.toolCallsPerSession / 12) +
    7 * clamp01(input.advancedWorkflowSessionRate / 0.3);
  const providerBreadth = 3 * Math.min(5, Math.max(0, input.activeCodingProviders));
  const deliveryPoints =
    Math.max(0, input.commits) +
    3 * Math.max(0, input.mergedPullRequests) +
    2 * Math.max(0, input.reviews) +
    5 * Math.max(0, input.releases);
  const delivery = 30 * clamp01(Math.log1p(deliveryPoints) / Math.log1p(200));

  const base = {
    consistency: round(consistency),
    workflowDepth: round(workflowDepth),
    providerBreadth: round(providerBreadth),
    delivery: round(delivery),
    deliveryPoints,
  };

  if (!input.githubConnected) return { eligible: false, reason: 'Connect GitHub to receive a ranked score.', total: null, ...base };
  if (input.coveredDays < 30) return { eligible: false, reason: 'At least 30 covered coding days are required.', total: null, ...base };
  return { eligible: true, total: Math.round(consistency + workflowDepth + providerBreadth + delivery), ...base };
}
