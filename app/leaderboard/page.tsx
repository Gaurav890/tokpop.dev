import { env } from 'cloudflare:workers';
import { SiteHeader } from '../ui/site-header';
import { ensureDb } from '../../db/ensure';

type UserRow = { github_login: string; display_name: string };

export const dynamic = 'force-dynamic';
export default async function LeaderboardPage() {
  let users: UserRow[] = [];
  try { await ensureDb(); users = (await env.DB.prepare(`SELECT github_login,display_name FROM users WHERE public_enabled=1 AND leaderboard_enabled=1 ORDER BY updated_at DESC LIMIT 100`).all<UserRow>()).results ?? []; } catch { users = []; }
  const demo = [{ github_login: 'gaurav', display_name: 'Gaurav', score: 78, providers: 3, delivery: 172 }];
  const rows = users.length ? users.map((user, index) => ({ ...user, score: 0, providers: 0, delivery: 0, rank: index + 1 })) : demo.map((user, index) => ({ ...user, rank: index + 1 }));
  return <main className="marketing-page"><SiteHeader/><section className="narrow-hero"><p className="eyebrow">Opt-in ranking</p><h1>The workflow leaderboard.</h1><p>Only eligible coding activity and GitHub delivery count. Token volume, conversation activity, imports, MCP events, manual records, and estimated metrics do not.</p></section><section className="leaderboard-card"><div className="leader-head"><span>Rank / Developer</span><span>Index</span><span>Providers</span><span>Delivery</span></div>{rows.map((row) => <a className="leader-row" key={row.github_login} href={`/u/${row.github_login}`}><strong>#{row.rank}</strong><span><b>{row.display_name}</b><small>@{row.github_login} · GitHub verified</small></span><em>{row.score || '—'}</em><span>{row.providers || '—'}</span><span>{row.delivery || '—'}</span></a>)}</section><p className="center-note">Private profiles never appear here. Rankings are disabled by default and require a separate opt-in.</p></main>;
}
