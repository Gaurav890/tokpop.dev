import { runtimeEnv as env } from '@/lib/runtime-env';
import { redirect } from 'next/navigation';
import { ensureDb } from '../../../db/ensure';
import { currentGitHubUser } from '../../../lib/auth';
import { SiteHeader } from '../../ui/site-header';
import { SettingsForm } from './settings-form';
import { backendJson, backendOrigin } from '../../../lib/server-api';

type SettingsRow = { public_enabled: number; leaderboard_enabled: number; conversation_enabled: number; comparison_enabled: number; storage_mode: 'managed' | 'github' };

export default async function PrivacyPage() {
  const user = await currentGitHubUser(); if (!user) redirect('/api/auth/github/start?return_to=/settings/privacy');
  let row: SettingsRow | null;
  if (backendOrigin()) row = (await backendJson<{ settings: SettingsRow | null }>('/api/v1/settings', { authenticated: true })).settings;
  else { await ensureDb(); row = await env.DB.prepare(`SELECT u.public_enabled,u.leaderboard_enabled,u.conversation_enabled,u.storage_mode,coalesce(c.enabled,0) AS comparison_enabled FROM users u LEFT JOIN comparison_optins c ON c.user_id=u.id WHERE u.id=?`).bind(user.userId).first<SettingsRow>(); }
  return <main className="marketing-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">Privacy & storage</p><h1>You control every public surface separately.</h1><p>Private is the default. Public profile, leaderboard, comparisons, conversation section, and session stories are independent decisions.</p></section><SettingsForm initial={{ publicEnabled: Boolean(row?.public_enabled), leaderboardEnabled: Boolean(row?.leaderboard_enabled), comparisonEnabled: Boolean(row?.comparison_enabled), conversationEnabled: Boolean(row?.conversation_enabled), storageMode: row?.storage_mode ?? 'managed' }}/></main>;
}
