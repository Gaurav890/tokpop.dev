import { runtimeEnv as env } from '@/lib/runtime-env';
import { SiteHeader } from '../ui/site-header';
import { ensureDb } from '../../db/ensure';
import { backendJson, backendOrigin } from '../../lib/server-api';
import { getPublicProfileFromDatabase } from '../../lib/profile';
import { rankLeaderboardProfiles, type LeaderboardEntry } from '../../lib/leaderboard';
import Link from '../ui/native-link';

type UserRow = { github_login: string };

export const dynamic = 'force-dynamic';
export default async function LeaderboardPage() {
  let rows: LeaderboardEntry[] = [];
  try {
    if (backendOrigin()) rows = (await backendJson<{ profiles: LeaderboardEntry[] }>('/api/v1/leaderboard')).profiles;
    else {
      await ensureDb();
      const users = (await env.DB.prepare(`SELECT github_login FROM users WHERE public_enabled=1 AND leaderboard_enabled=1 ORDER BY updated_at DESC LIMIT 100`).all<UserRow>()).results ?? [];
      rows = rankLeaderboardProfiles(await Promise.all(users.map((user) => getPublicProfileFromDatabase(user.github_login))));
    }
  } catch { rows = []; }
  return <main className="marketing-page"><SiteHeader/><section className="narrow-hero"><p className="eyebrow">Opt-in ranking</p><h1>The workflow leaderboard.</h1><p>Only eligible coding activity and GitHub delivery count. Token volume, conversation activity, imports, MCP events, manual records, and estimated metrics do not.</p></section>{rows.length ? <section className="leaderboard-card"><div className="leader-head"><span>Rank / Developer</span><span>Index</span><span>Providers</span><span>Delivery</span></div>{rows.map((row) => <a className="leader-row" key={row.username} href={`/u/${row.username}`}><strong>#{row.rank}</strong><span><b>{row.name}</b><small>@{row.username} · GitHub verified · {row.activeDays} active days</small></span><em>{row.score}</em><span>{row.providers}</span><span>{row.delivery}</span></a>)}</section> : <section className="leaderboard-empty"><p className="eyebrow">No ranked profiles yet</p><h2>The first positions have to be earned.</h2><p>A profile appears only after its owner opts in, connects GitHub, and reaches at least 30 covered coding days. No sample accounts or estimated activity are inserted here.</p><Link className="primary-link" href="/connections">Build an eligible profile</Link></section>}<p className="center-note">Private profiles never appear here. Rankings are disabled by default and require a separate opt-in.</p></main>;
}
