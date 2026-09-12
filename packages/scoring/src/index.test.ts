import { describe, expect, it } from 'vitest';
import { calculateWorkflowIndex } from './index';

const complete = {
  githubConnected: true,
  coveredDays: 90,
  activeCodingDays90: 45,
  longestStreak90: 14,
  toolUsingSessionRate: 0.8,
  medianToolCallsPerSession: 12,
  advancedWorkflowSessionRate: 0.3,
  activeCodingProviders: 5,
  commits: 200,
  mergedPullRequests: 0,
  reviews: 0,
  releases: 0,
};

describe('calculateWorkflowIndex', () => {
  it('caps a complete profile at 100', () => expect(calculateWorkflowIndex(complete).total).toBe(100));
  it('requires GitHub', () => expect(calculateWorkflowIndex({ ...complete, githubConnected: false }).eligible).toBe(false));
  it('requires 30 days of coverage', () => expect(calculateWorkflowIndex({ ...complete, coveredDays: 29 }).reason).toContain('30'));
  it('weights delivery events according to the published formula', () => {
    const score = calculateWorkflowIndex({ ...complete, commits: 1, mergedPullRequests: 1, reviews: 1, releases: 1 });
    expect(score.deliveryPoints).toBe(11);
  });
});
