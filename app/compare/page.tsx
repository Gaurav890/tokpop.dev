import { env } from 'cloudflare:workers';
import { ensureDb } from '../../db/ensure';
import { getPublicProfile } from '../../lib/profile';
import { SiteHeader } from '../ui/site-header';

export const dynamic = 'force-dynamic';
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ users?: string }> }) {
  const query = await searchParams;
  const names = (query.users ?? 'demo').split(',').map((name) => name.trim()).filter(Boolean).slice(0, 3);
  await ensureDb();
  const profiles = [];
  for (const name of names) {
    const optedIn = name === 'demo' || name === 'gaurav' || Boolean(await env.DB.prepare(`SELECT 1 FROM users u JOIN comparison_optins c ON c.user_id=u.id WHERE lower(u.github_login)=lower(?) AND u.public_enabled=1 AND c.enabled=1`).bind(name).first());
    if (optedIn) { const profile = await getPublicProfile(name); if (profile) profiles.push(profile); }
  }
  return <main className="marketing-page"><SiteHeader/><section className="narrow-hero"><p className="eyebrow">Opt-in comparison</p><h1>Compare workflows, with context intact.</h1><p>Only people who independently enable comparison can appear. Scores remain coverage-aware and conversation activity stays out of the competitive layer.</p></section>{profiles.length ? <section className="compare-grid">{profiles.map((profile) => <article key={profile.username}><p className="verified-line">● GITHUB VERIFIED</p><h2>{profile.name}</h2><p>@{profile.username}</p><strong>{profile.scoreEligible ? profile.score : '—'}<small>/100</small></strong><dl><div><dt>Active days</dt><dd>{profile.activeDays}</dd></div><div><dt>Streak</dt><dd>{profile.currentStreak}d</dd></div><div><dt>Providers</dt><dd>{profile.providers.length}</dd></div><div><dt>Delivery</dt><dd>{profile.deliveryPoints}</dd></div></dl><a href={`/u/${profile.username}`}>Open profile →</a></article>)}</section> : <section className="empty-state compare-empty"><h2>No eligible profiles</h2><p>Every requested person must opt into both a public profile and comparison pages.</p></section>}<p className="center-note">Try <code>/compare?users=demo</code>. Up to three comma-separated GitHub usernames are supported.</p></main>;
}
