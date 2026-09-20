import { redirect } from 'next/navigation';
import { runtimeEnv as env } from '@/lib/runtime-env';
import { ensureDb } from '../../db/ensure';
import { currentGitHubUser } from '../../lib/auth';
import { getPrivateProfile } from '../../lib/profile';
import { backendJson, backendOrigin } from '../../lib/server-api';
import { SiteHeader } from '../ui/site-header';
import { ActivationShare } from './activation-share';
import { compactMetric } from '../../lib/profile-archetype';

type SettingsRow = {
  public_enabled: number;
  leaderboard_enabled: number;
  conversation_enabled: number;
  comparison_enabled: number;
  storage_mode: 'managed' | 'github';
};

export const dynamic = 'force-dynamic';

export default async function SharePage({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  const user = await currentGitHubUser();
  if (!user) redirect('/api/auth/github/start?return_to=/share');

  const [{ onboarding }, profile] = await Promise.all([searchParams, getPrivateProfile(user.userId)]);
  let settings: SettingsRow | null;
  if (backendOrigin()) {
    settings = (await backendJson<{ settings: SettingsRow | null }>('/api/v1/settings', { authenticated: true })).settings;
  } else {
    await ensureDb();
    settings = await env.DB.prepare(`SELECT u.public_enabled,u.leaderboard_enabled,u.conversation_enabled,u.storage_mode,coalesce(c.enabled,0) AS comparison_enabled FROM users u LEFT JOIN comparison_optins c ON c.user_id=u.id WHERE u.id=?`).bind(user.userId).first<SettingsRow>();
  }

  return <main className="marketing-page activation-page">
    <SiteHeader user={user}/>
    <section className="activation-hero">
      <div>
        <p className="eyebrow">{onboarding === '1' ? 'Onboarding · step 3 of 3' : 'Publish and share'}</p>
        <h1>Turn your evidence into something people can see.</h1>
        <p>Your GitHub-verified starter profile can be published without installing anything. Add a live card to your README now, then connect coding evidence later if you want. Publishing never exposes prompts, code, repository names, or credentials.</p>
      </div>
      <div className="activation-step"><span>{settings?.public_enabled ? 'LIVE' : 'PRIVATE'}</span><strong>{profile?.archetype.emoji} {profile?.archetype.title ?? 'Workflow Builder'}</strong><small>{compactMetric(profile?.lifetimeTokens ?? 0)} tokens · {profile?.providers.length ?? 0} providers · {profile?.activeDays ?? 0} active days</small></div>
    </section>
    <ActivationShare
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
        sessions: profile?.sessions ?? 0,
        archetype: profile?.archetype ?? { emoji: '⚡', title: 'Workflow Builder', summary: 'Building an evidence-backed coding workflow, one active day at a time.' },
      }}
    />
  </main>;
}
