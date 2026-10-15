export const githubContributionSchema = 'anp.github-contributions.v2';
export const githubContributionWindowDays = 90;

export type GitHubContributionSnapshot = {
  coverageStart: string;
  coverageEnd: string;
  commits: number;
  pullRequests: number;
  reviews: number;
  privateContributions: number;
  totalContributions: number;
  activeDays: number;
};

type ContributionResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        totalCommitContributions?: number;
        totalPullRequestContributions?: number;
        totalPullRequestReviewContributions?: number;
        restrictedContributionsCount?: number;
        contributionCalendar?: {
          totalContributions?: number;
          weeks?: Array<{ contributionDays?: Array<{ contributionCount?: number }> }>;
        };
      };
    } | null;
  };
  errors?: Array<{ message?: string }>;
};

const contributionQuery = `
  query ContributionTotals($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
            }
          }
        }
      }
    }
  }
`;

function wholeNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('GitHub returned incomplete contribution totals. Previous receipts were preserved.');
  return value;
}

function startOfContributionWindow(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (githubContributionWindowDays - 1)));
}

export async function collectGitHubContributions(
  token: string,
  login: string,
  options: { now?: Date; fetch?: typeof fetch } = {},
): Promise<GitHubContributionSnapshot> {
  const now = options.now ?? new Date();
  const from = startOfContributionWindow(now);
  const fetcher = options.fetch ?? fetch;
  const response = await fetcher('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'ai-native-profile',
    },
    body: JSON.stringify({
      query: contributionQuery,
      variables: { login, from: from.toISOString(), to: now.toISOString() },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.json().catch(() => ({})) as ContributionResponse;
  if (!response.ok || body.errors?.length) {
    const detail = body.errors?.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(detail || `GitHub contribution lookup failed (${response.status}).`);
  }
  const collection = body.data?.user?.contributionsCollection;
  if (!collection) throw new Error('GitHub contribution history was unavailable for this account.');
  if (!Array.isArray(collection.contributionCalendar?.weeks)) throw new Error('GitHub contribution calendar was unavailable.');
  const days = collection.contributionCalendar.weeks.flatMap((week) => week.contributionDays ?? []);
  return {
    coverageStart: from.toISOString().slice(0, 10),
    coverageEnd: now.toISOString().slice(0, 10),
    commits: wholeNumber(collection.totalCommitContributions),
    pullRequests: wholeNumber(collection.totalPullRequestContributions),
    reviews: wholeNumber(collection.totalPullRequestReviewContributions),
    privateContributions: wholeNumber(collection.restrictedContributionsCount),
    totalContributions: wholeNumber(collection.contributionCalendar?.totalContributions),
    activeDays: days.filter((day) => wholeNumber(day.contributionCount) > 0).length,
  };
}
