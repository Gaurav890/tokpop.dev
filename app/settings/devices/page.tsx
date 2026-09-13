import { runtimeEnv as env } from '@/lib/runtime-env';
import { redirect } from 'next/navigation';
import { ensureDb } from '../../../db/ensure';
import { currentGitHubUser } from '../../../lib/auth';
import { SiteHeader } from '../../ui/site-header';
import { DeviceList } from './device-list';
import { backendJson, backendOrigin } from '../../../lib/server-api';

type Device = { id: string; name: string; status: string; lastSeenAt: string | null; createdAt: string };

export default async function DevicesPage() { const user = await currentGitHubUser(); if (!user) redirect('/api/auth/github/start?return_to=/settings/devices'); let devices: Device[]; if (backendOrigin()) devices = (await backendJson<{ devices: Device[] }>('/api/v1/devices', { authenticated: true })).devices; else { await ensureDb(); const result = await env.DB.prepare(`SELECT id,name,status,last_seen_at AS "lastSeenAt",created_at AS "createdAt" FROM devices WHERE user_id=? ORDER BY created_at DESC`).bind(user.userId).all<Device>(); devices = result.results ?? []; } return <main className="marketing-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">Device management</p><h1>Every collector has an off switch.</h1><p>Revoking a device blocks future signed batches without changing provider logins or local files.</p></section><DeviceList initial={devices}/></main>; }
