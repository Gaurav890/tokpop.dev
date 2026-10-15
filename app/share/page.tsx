import { redirect } from 'next/navigation';
import { runtimeEnv as env } from '@/lib/runtime-env';
import { ensureDb } from '../../db/ensure';
import { currentGitHubUser } from '../../lib/auth';
import { getPrivateProfile } from '../../lib/profile';
import { backendJson, backendOrigin } from '../../lib/server-api';
import { SiteHeader } from '../ui/site-header';
import { ActivationShare } from './activation-share';
import { compactMetric } from '../../lib/profile-archetype';
import { GitHubProofSync } from '../connect/github-proof-sync';
import { PowerUpPanel } from './power-up-panel';
import { SiteFooter } from '../ui/site-footer';
import { publicAppOrigin } from '../../lib/public-origin';
import { SyncHealth } from '../ui/sync-health';

type SettingsRow = {
  public_enabled: number;
  leaderboard_enabled: number;
  conversation_enabled: number;
  comparison_enabled: number;
  storage_mode: 'managed' | 'github';
};

export const dynamic = 'force-dynamic';

export default async function SharePage() {
  const user = await currentGitHubUser();
  if (!user) redirect('/api/auth/github/start?return_to=/share');

  const profile = await getPrivateProfile(user.userId);
  let settings: SettingsRow | null;
  if (backendOrigin()) {
    settings = (await backendJson<{ settings: SettingsRow | null }>('/api/v1/settings', { authenticated: true })).settings;
  } else {
    await ensureDb();
    settings = await env.DB.prepare(`SELECT u.public_enabled,u.leaderboard_enabled,u.conversation_enabled,u.storage_mode,coalesce(c.enabled,0) AS comparison_enabled FROM users u LEFT JOIN comparison_optins c ON c.user_id=u.id WHERE u.id=?`).bind(user.userId).first<SettingsRow>();
  }
  const hasCodingEvidence = Boolean(profile?.providers.length);
  const publicOrigin = env.PUBLIC_APP_URL ? publicAppOrigin(env.PUBLIC_APP_URL) : undefined;

  return <main className="marketing-page activation-page">
    <SiteHeader user={user}/>
    <section className={`activation-hero ${hasCodingEvidence ? 'share-ready-hero' : ''}`}>
      <div>
        <p className="eyebrow">{hasCodingEvidence ? 'Your build identity is ready 🎉' : 'Your private card is ready'}</p>
        <h1>{hasCodingEvidence ? 'Meet your AI build alter ego.' : 'One command unlocks your real stats.'}</h1>
        <p>{hasCodingEvidence ? 'Your tools, tokens, streak, and shipping are ready to share. Pick a look, add the card to GitHub, then choose whether to join the leaderboard.' : 'Connect every supported coding tool together, review the exact aggregate fields, and watch this page turn into your live build card.'}</p>
      </div>
      <div className="activation-step"><span>{settings?.public_enabled ? 'LIVE ●' : 'UNLOCKED'}</span><strong>{profile?.archetype.emoji} {profile?.archetype.title ?? 'Workflow Builder'}</strong><small>{compactMetric(profile?.lifetimeTokens ?? 0)} tokens · {profile?.providers.length ?? 0} tools · {profile?.currentStreak ?? 0}-day streak</small></div>
    </section>
    {!hasCodingEvidence ? <PowerUpPanel hasCodingEvidence={false} publicOrigin={publicOrigin}/> : null}
    <ActivationShare
      publicOrigin={publicOrigin}
      username={user.login}
      initialSettings={{
        publicEnabled: Boolean(settings?.public_enabled),
        leaderboardEnabled: Boolean(settings?.leaderboard_enabled),
        comparisonEnabled: Boolean(settings?.comparison_enabled),
        conversationEnabled: Boolean(settings?.conversation_enabled),
        storageMode: settings?.storage_mode ?? 'managed',
      }}
      profile={{
        score: profile?.scoreEligible ? profile.score : null,
        scoreEligible: Boolean(profile?.scoreEligible),
        scoreReason: profile?.scoreReason,
        activeDays: profile?.activeDays ?? 0,
        streakDays: profile?.currentStreak ?? 0,
        deliveryPoints: profile?.deliveryPoints ?? 0,
        providers: profile?.providers ?? [],
        lifetimeTokens: profile?.lifetimeTokens ?? 0,
        tokenBreakdown: profile?.tokenBreakdown.map(({ label, tokens }) => ({ label, tokens })) ?? [],
        sessions: profile?.sessions ?? 0,
        updatedAt: profile?.updatedAt ?? new Date().toISOString(),
        archetype: profile?.archetype ?? { emoji: '⚡', title: 'Workflow Builder', summary: 'Building an evidence-backed coding workflow, one active day at a time.' },
      }}
    />
    <section className="share-connection-status" aria-label="Connection status">
      {profile ? <SyncHealth profile={profile} owner compact/> : null}
      <GitHubProofSync quiet={hasCodingEvidence}/>
    </section>
    <SiteFooter/>
  </main>;
}
