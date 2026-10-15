import { runtimeEnv as env } from './runtime-env';
import {
  githubContributionSchema,
  githubContributionWindowDays,
  type GitHubContributionSnapshot,
} from './github-contribution-api';

export {
  collectGitHubContributions,
  githubContributionSchema,
  githubContributionWindowDays,
  type GitHubContributionSnapshot,
} from './github-contribution-api';

export async function storeGitHubContributions(userId: string, snapshot: GitHubContributionSnapshot): Promise<void> {
  const metrics = {
    commits: snapshot.commits,
    pull_requests: snapshot.pullRequests,
    reviews: snapshot.reviews,
    private_contributions: snapshot.privateContributions,
  };
  const statements = [env.DB.prepare(`DELETE FROM daily_metrics WHERE user_id=? AND source='github'`).bind(userId)];
  for (const [name, value] of Object.entries(metrics)) {
    statements.push(env.DB.prepare(`INSERT INTO daily_metrics (user_id,date,source,category,metric_name,value,unit,provenance,competitive_eligible) VALUES (?,?,'github','delivery',?,?,'count','official_account_api',1)`).bind(userId, snapshot.coverageEnd, name, value));
  }
  statements.push(env.DB.prepare(`INSERT INTO source_coverage (user_id,source,coverage_start,coverage_end,last_synced_at,completeness,competitive_eligible,note) VALUES (?,'github',?,?,?,'full',1,?) ON CONFLICT(user_id,source) DO UPDATE SET coverage_start=excluded.coverage_start,coverage_end=excluded.coverage_end,last_synced_at=excluded.last_synced_at,completeness='full',competitive_eligible=1,note=excluded.note`).bind(
    userId,
    snapshot.coverageStart,
    snapshot.coverageEnd,
    new Date().toISOString(),
    `${githubContributionSchema}: GitHub-defined ${githubContributionWindowDays}-day contribution totals; private counts depend on account visibility and access. Restricted contributions are coverage context, not additional delivery points.`,
  ));
  await env.DB.batch(statements);
}
