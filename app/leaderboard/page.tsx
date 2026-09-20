import { runtimeEnv as env } from '@/lib/runtime-env';
import { SiteHeader } from '../ui/site-header';
import { SiteFooter } from '../ui/site-footer';
import { ensureDb } from '../../db/ensure';
import { backendJson, backendOrigin } from '../../lib/server-api';
import { getPublicProfileFromDatabase } from '../../lib/profile';
import { rankLeaderboardProfiles, type LeaderboardEntry } from '../../lib/leaderboard';
import { currentGitHubUser } from '../../lib/auth';
import Link from '../ui/native-link';

type UserRow = { github_login: string };

export const dynamic = 'force-dynamic';
export default async function LeaderboardPage() {
  const userPromise = currentGitHubUser();
  let rows: LeaderboardEntry[] = [];
  try {
    if (backendOrigin()) rows = (await backendJson<{ profiles: LeaderboardEntry[] }>('/api/v1/leaderboard')).profiles;
    else {
      await ensureDb();
      const users = (await env.DB.prepare(`SELECT github_login FROM users WHERE public_enabled=1 AND leaderboard_enabled=1 ORDER BY updated_at DESC LIMIT 100`).all<UserRow>()).results ?? [];
      rows = rankLeaderboardProfiles(await Promise.all(users.map((user) => getPublicProfileFromDatabase(user.github_login))));
    }
  } catch { rows = []; }
  const user = await userPromise;
  return <main className="marketing-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">Opt-in ranking</p><h1>The workflow leaderboard.</h1><p>Consistency, workflow depth, provider breadth, and shipping count. Raw token volume never increases rank.</p></section>{rows.length ? <section className="leaderboard-card"><div className="leader-head"><span>Rank / Developer</span><span>Level</span><span>Tools</span><span>Delivery</span></div>{rows.map((row) => <a className="leader-row" key={row.username} href={`/u/${row.username}`}><strong>#{row.rank}</strong><span><b>{row.name}</b><small>@{row.username} · GitHub verified · {row.activeDays} active days</small></span><em>{row.score}</em><span>{row.providers}</span><span>{row.delivery}</span></a>)}</section> : <section className="leaderboard-empty"><p className="eyebrow">The board is warming up</p><h2>Be one of the first builders on it.</h2><p>Connect coding activity, reach 30 covered days, publish your card, and opt in. No sample accounts or estimated activity are inserted here.</p><Link className="primary-link" href="/share">Build my card</Link></section>}<p className="center-note">Private profiles never appear here. Joining is always optional.</p><SiteFooter/></main>;
}
