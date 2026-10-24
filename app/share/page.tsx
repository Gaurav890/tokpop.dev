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
import { ShareStage } from './share-stage';
import { CONNECTOR_VERSION } from '../../lib/collector-command';
import Link from '../ui/native-link';
import { hasCardActivity } from '../../lib/setup-progress';
import { buildRecap } from '../../lib/build-recap';
import { BuildRecap } from './build-recap';

type SettingsRow = {
  public_enabled: number;
  leaderboard_enabled: number;
  conversation_enabled: number;
  comparison_enabled: number;
  storage_mode: 'managed' | 'github';
};

export const dynamic = 'force-dynamic';

export default async function SharePage({ searchParams }: { searchParams: Promise<{ connect?: string }> }) {
  const user = await currentGitHubUser();
  const { connect } = await searchParams;
  if (!user) redirect(`/api/auth/github/start?return_to=${encodeURIComponent(connect === '1' ? '/share?connect=1' : '/share')}`);

  const profile = await getPrivateProfile(user.userId);
  let settings: SettingsRow | null;
  if (backendOrigin()) {
    settings = (await backendJson<{ settings: SettingsRow | null }>('/api/v1/settings', { authenticated: true })).settings;
  } else {
    await ensureDb();
    settings = await env.DB.prepare(`SELECT u.public_enabled,u.leaderboard_enabled,u.conversation_enabled,u.storage_mode,coalesce(c.enabled,0) AS comparison_enabled FROM users u LEFT JOIN comparison_optins c ON c.user_id=u.id WHERE u.id=?`).bind(user.userId).first<SettingsRow>();
  }
  const hasCodingEvidence = hasCardActivity(profile);
  const publicOrigin = env.PUBLIC_APP_URL ? publicAppOrigin(env.PUBLIC_APP_URL) : undefined;

  return <main className="marketing-page activation-page">
    <SiteHeader user={user}/>
    {!settings?.public_enabled ? <ol className="workspace-steps" aria-label="Your card setup">
      <li className="done"><span>✓</span> GitHub connected</li>
      <li className={hasCodingEvidence ? 'done' : 'current'} aria-current={!hasCodingEvidence ? 'step' : undefined}><span>{hasCodingEvidence ? '✓' : '2'}</span> Connect tools</li>
      <li className={hasCodingEvidence ? 'current' : ''} aria-current={hasCodingEvidence ? 'step' : undefined}><span>3</span> Reveal &amp; share</li>
    </ol> : null}
    <section className={`activation-hero ${hasCodingEvidence ? 'share-ready-hero' : ''}`}>
      <div>
        <p className="eyebrow">{hasCodingEvidence ? 'Your build identity 🎉' : `You’re in, @${user.login}`}</p>
        <h1>{hasCodingEvidence ? 'Your build. Your signature.' : 'Let’s reveal your builder card.'}</h1>
        <p>{hasCodingEvidence ? 'Pick your look, then put your card in your README. Keep building; your next sync brings the next update.' : 'One command on your coding computer. Your card appears right here when activity arrives.'}</p>
      </div>
      {hasCodingEvidence ? <div className="activation-step"><span>{settings?.public_enabled ? 'PUBLIC ●' : 'PRIVATE PREVIEW'}</span><strong>{profile?.archetype.emoji} {profile?.archetype.title}</strong><small>{compactMetric(profile?.lifetimeTokens ?? 0)} tokens · {profile?.providers.length ?? 0} tools · {profile?.currentStreak ?? 0}-day streak</small></div> : null}
    </section>
    {!hasCodingEvidence || connect === '1' ? <PowerUpPanel hasCodingEvidence={false} accountLogin={user.login} publicOrigin={publicOrigin}/> : null}
    <ShareStage ready={hasCodingEvidence} accountLogin={user.login}>
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
    </ShareStage>
    {hasCodingEvidence && profile ? <BuildRecap recap={buildRecap(profile.activity, profile.dailyTokens)}/> : null}
    {hasCodingEvidence ? <details className="workspace-tools"><summary>Tools, computers &amp; automatic updates</summary><p>Automatic updates are optional and must be enabled in Terminal. A recent upload alone does not confirm the background job is running.</p><Link href="/share?connect=1#power-up">Add another computer →</Link><Link href="/connections">See tool history and sync details →</Link><Link href="/settings/devices">Manage computers →</Link><p>Run <code>npm exec --yes --package=ai-native-profile@{CONNECTOR_VERSION} -- ai-native-profile doctor</code> on your coding computer to check automatic updates.</p></details> : null}
    <section className="share-connection-status" aria-label="Connection status">
      {profile ? <SyncHealth profile={profile} owner compact/> : null}
      <GitHubProofSync quiet={hasCodingEvidence}/>
    </section>
    <SiteFooter/>
  </main>;
}
