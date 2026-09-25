import { redirect } from 'next/navigation';
import { currentGitHubUser } from '../../../lib/auth';
import { SiteHeader } from '../../ui/site-header';
import { GitHubSync } from './github-sync';
export default async function GitHubSettingsPage() { const user = await currentGitHubUser(); if (!user) redirect('/api/auth/github/start?return_to=/settings/github'); return <main className="marketing-page settings-page github-settings-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">GitHub power-up</p><h1>Show the contribution graph. Keep repo names secret.</h1><p>The profile reads only GitHub’s account-level 90-day totals. Repository names, commit messages, code, and pull-request titles are never stored.</p></section><div className="settings-stack"><GitHubSync/></div></main>; }
