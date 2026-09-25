import { runtimeEnv as env } from '@/lib/runtime-env';
import { redirect } from 'next/navigation';
import { ensureDb } from '../../../db/ensure';
import { currentGitHubUser } from '../../../lib/auth';
import { SiteHeader } from '../../ui/site-header';
import { DeviceList } from './device-list';
import { backendJson, backendOrigin } from '../../../lib/server-api';

type Device = { id: string; name: string; status: string; lastSeenAt: string | null; createdAt: string };

export default async function DevicesPage() { const user = await currentGitHubUser(); if (!user) redirect('/api/auth/github/start?return_to=/settings/devices'); let devices: Device[]; if (backendOrigin()) devices = (await backendJson<{ devices: Device[] }>('/api/v1/devices', { authenticated: true })).devices; else { await ensureDb(); const result = await env.DB.prepare(`SELECT id,name,status,last_seen_at AS "lastSeenAt",created_at AS "createdAt" FROM devices WHERE user_id=? ORDER BY created_at DESC`).bind(user.userId).all<Device>(); devices = result.results ?? []; } return <main className="marketing-page settings-page devices-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">Your connected machines</p><h1>Every power-up has an off switch.</h1><p>Revoke a device to stop future signed updates. Provider logins and local files stay untouched.</p></section><DeviceList initial={devices}/></main>; }
