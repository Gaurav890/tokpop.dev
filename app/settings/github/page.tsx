import { redirect } from 'next/navigation';
import { currentGitHubUser } from '../../../lib/auth';
import { SiteHeader } from '../../ui/site-header';
import { GitHubSync } from './github-sync';
export default async function GitHubSettingsPage() { const user = await currentGitHubUser(); if (!user) redirect('/api/auth/github/start?return_to=/settings/github'); return <main className="marketing-page settings-page github-settings-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">GitHub power-up</p><h1>Show the shipping. Keep repo names secret.</h1><p>Public activity uses minimum read-only identity access. Private repository aggregates need a separate approval and never switch on by surprise.</p></section><div className="settings-stack"><GitHubSync/></div></main>; }
