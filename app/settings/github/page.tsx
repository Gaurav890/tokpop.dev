import { redirect } from 'next/navigation';
import { currentGitHubUser } from '../../../lib/auth';
import { SiteHeader } from '../../ui/site-header';
import { GitHubSync } from './github-sync';
export default async function GitHubSettingsPage() { const user = await currentGitHubUser(); if (!user) redirect('/api/auth/github/start?return_to=/settings/github'); return <main className="marketing-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">GitHub evidence</p><h1>Delivery signals, without exposing repository names.</h1><p>Public activity uses minimum read-only identity access. Private repository aggregates require a separately authorized GitHub App and are never enabled implicitly.</p></section><div className="settings-stack"><GitHubSync/></div></main>; }
