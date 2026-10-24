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
  return <main className="marketing-page leaderboard-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">The builder arcade · opt in only</p><h1>Climb the build board.</h1><p>Level up through consistency, workflow depth, tool breadth, and shipping. Token volume does not affect your rank.</p></section>{rows.length ? <section className="leaderboard-card"><div className="leader-head"><span>Rank / Builder</span><span>Level</span><span>Tools</span><span>Delivery</span></div>{rows.map((row) => <a className="leader-row" key={row.username} href={`/u/${row.username}`}><strong>#{row.rank}</strong><span><b>{row.name}</b><small>@{row.username} · GitHub verified · {row.activeDays} active days</small></span><em>{row.score}</em><span>{row.providers}</span><span>{row.delivery}</span></a>)}</section> : <section className="leaderboard-empty"><p className="eyebrow">🏁 The board is warming up</p><h2>Claim an early spot.</h2><p>Connect your tools, publish your card, and opt in. Ranking needs 30 covered coding days and a fresh GitHub snapshot. Eligible history already on your computer counts.</p><Link className="primary-link" href="/share">Build my card →</Link></section>}<p className="center-note">🔒 Private profiles stay invisible. Joining the game is always optional.</p><SiteFooter/></main>;
}
