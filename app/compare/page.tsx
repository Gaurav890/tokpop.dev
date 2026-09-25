import { runtimeEnv as env } from '@/lib/runtime-env';
import { ensureDb } from '../../db/ensure';
import { getPublicProfile } from '../../lib/profile';
import { SiteHeader } from '../ui/site-header';
import { backendJson, backendOrigin } from '../../lib/server-api';

export const dynamic = 'force-dynamic';
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ users?: string }> }) {
  const query = await searchParams;
  const names = (query.users ?? 'demo').split(',').map((name) => name.trim()).filter(Boolean).slice(0, 3);
  const usesBackend = Boolean(backendOrigin());
  const needsDatabase = names.some((name) => name.toLowerCase() !== 'demo');
  if (!usesBackend && needsDatabase) await ensureDb();
  const candidates = await Promise.all(names.map(async (name) => {
    const profileName = name.toLowerCase() === 'demo' ? 'demo' : name;
    const optedIn = profileName === 'demo' ? true : usesBackend
      ? (await backendJson<{ eligible: boolean }>(`/api/v1/comparison/${encodeURIComponent(name)}`)).eligible
      : Boolean(await env.DB.prepare(`SELECT 1 FROM users u JOIN comparison_optins c ON c.user_id=u.id WHERE lower(u.github_login)=lower(?) AND u.public_enabled=1 AND c.enabled=1`).bind(name).first());
    return optedIn ? getPublicProfile(profileName) : null;
  }));
  const profiles = candidates.filter((profile) => profile !== null);
  return <main className="marketing-page compare-page"><SiteHeader/><section className="narrow-hero"><p className="eyebrow">Friendly face-off · opt in only</p><h1>Put build styles side by side.</h1><p>Compare visible workflows without stripping away context. Everyone must opt in, scores stay coverage-aware, and conversation activity stays out of the game.</p></section>{profiles.length ? <section className="compare-grid">{profiles.map((profile) => <article key={profile.username}><p className="verified-line">● VERIFIED PLAYER</p><h2>{profile.name}</h2><p>@{profile.username}</p><strong>{profile.scoreEligible ? profile.score : '—'}<small>/100</small></strong><dl><div><dt>Active days</dt><dd>{profile.activeDays}</dd></div><div><dt>Streak</dt><dd>{profile.currentStreak}d</dd></div><div><dt>Tools</dt><dd>{profile.providers.length}</dd></div><div><dt>Delivery</dt><dd>{profile.deliveryPoints}</dd></div></dl><a href={`/u/${profile.username}`}>Meet this build →</a></article>)}</section> : <section className="empty-state compare-empty"><p className="eyebrow">⚔️ No matchup yet</p><h2>Invite another opted-in builder.</h2><p>Every requested person must enable both a public profile and comparison pages.</p></section>}<p className="center-note">Try <code>/compare?users=demo</code>. Up to three comma-separated GitHub usernames are supported.</p></main>;
}
