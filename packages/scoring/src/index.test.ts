import { describe, expect, it } from 'vitest';
import { calculateWorkflowIndex } from './index';

const complete = {
  githubConnected: true,
  coveredDays: 90,
  activeCodingDays90: 45,
  longestStreak90: 14,
  toolUsingSessionRate: 0.8,
  toolCallsPerSession: 12,
  advancedWorkflowSessionRate: 0.3,
  activeCodingProviders: 5,
  commits: 200,
  pullRequests: 0,
  reviews: 0,
};

describe('calculateWorkflowIndex', () => {
  it('does not rank unavailable or stale delivery as verified zero activity', () => {
    expect(calculateWorkflowIndex({ ...complete, deliveryAvailable: false })).toMatchObject({ eligible: false, total: null });
  });
  it('does not add restricted contributions or legacy release counts', () => {
    const extra = { privateContributions: 1000, releases: 1000, mergedPullRequests: 1000 };
    expect(calculateWorkflowIndex({ ...complete, commits: 0, pullRequests: 0, reviews: 0, ...extra }).deliveryPoints).toBe(0);
  });
  it('caps a complete profile at 100', () => expect(calculateWorkflowIndex(complete).total).toBe(100));
  it('requires GitHub', () => expect(calculateWorkflowIndex({ ...complete, githubConnected: false }).eligible).toBe(false));
  it('requires 30 days of coverage', () => expect(calculateWorkflowIndex({ ...complete, coveredDays: 29 }).reason).toContain('30'));
  it('weights delivery events according to the published formula', () => {
    const score = calculateWorkflowIndex({ ...complete, commits: 1, pullRequests: 1, reviews: 1 });
    expect(score.deliveryPoints).toBe(6);
  });
});
