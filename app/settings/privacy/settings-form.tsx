'use client';
/* eslint-disable @next/next/no-html-link-for-pages */

import { useState } from 'react';

type Settings = { publicEnabled: boolean; leaderboardEnabled: boolean; conversationEnabled: boolean; comparisonEnabled: boolean; storageMode: 'managed' | 'github' };

export function SettingsForm({ initial }: { initial: Settings }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState('');
  const [repo, setRepo] = useState('ai-native-profile-data');
  async function save() {
    setStatus('Saving…');
    const response = await fetch('/api/v1/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) });
    const body = await response.json().catch(() => ({})) as { error?: string };
    setStatus(response.ok ? 'Privacy settings saved.' : body.error ?? 'Could not save settings.');
  }
  async function configureGithub() { setStatus('Checking private repository access…'); const response = await fetch('/api/v1/storage/github', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ repo }) }); const body = await response.json().catch(() => ({})) as { error?: string; authorizeUrl?: string }; if (response.status === 403 && body.authorizeUrl) { window.location.href = body.authorizeUrl; return; } setStatus(response.ok ? 'Private snapshot repository configured. Save to switch storage modes.' : body.error ?? 'Configuration failed.'); }
  async function deleteAccount() {
    if (!window.confirm('Delete your profile, devices, metrics, imports, and shared stories? This cannot be undone.')) return;
    const response = await fetch('/api/v1/account', { method: 'DELETE' });
    if (response.ok) window.location.href = '/'; else setStatus('Account deletion failed.');
  }
  const toggle = (key: 'publicEnabled' | 'leaderboardEnabled' | 'conversationEnabled' | 'comparisonEnabled') => <label className="toggle-row"><span><strong>{key === 'publicEnabled' ? 'Public profile' : key === 'leaderboardEnabled' ? 'Leaderboard participation' : key === 'comparisonEnabled' ? 'Comparison pages' : 'Conversation section'}</strong><small>{key === 'publicEnabled' ? 'Publish /u/username and cards.' : key === 'leaderboardEnabled' ? 'Requires a public profile and eligible score.' : key === 'comparisonEnabled' ? 'Allow your public profile in side-by-side comparisons.' : 'Show optional ChatGPT/Claude aggregates publicly.'}</small></span><input type="checkbox" checked={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.checked })}/></label>;
  return <section className="settings-stack"><article className="settings-card"><p className="eyebrow">Visibility</p>{toggle('publicEnabled')}{toggle('leaderboardEnabled')}{toggle('comparisonEnabled')}{toggle('conversationEnabled')}<button className="primary-button" onClick={save}>Save settings</button>{status && <p className="status-line">{status}</p>}</article><article className="settings-card"><p className="eyebrow">Canonical storage</p><div className="storage-options"><button className={values.storageMode === 'managed' ? 'selected' : ''} onClick={() => setValues({ ...values, storageMode: 'managed' })}><strong>Managed cloud</strong><span>Structured aggregates live in managed PostgreSQL storage.</span></button><button className={values.storageMode === 'github' ? 'selected' : ''} onClick={() => setValues({ ...values, storageMode: 'github' })}><strong>GitHub-backed</strong><span>Signed snapshots in your private repository; cloud keeps a serving projection.</span></button></div>{values.storageMode === 'github' && <div className="repo-config"><input value={repo} onChange={(event) => setRepo(event.target.value)} aria-label="Private repository name"/><button className="secondary-button" onClick={configureGithub}>Configure private repo</button></div>}<p className="fine-print">Repository permission is requested only when you configure this mode. Public identity OAuth remains read-only.</p></article><article className="settings-card danger-zone"><p className="eyebrow">Data controls</p><h2>Export or delete</h2><p>Download structured data at any time. Deletion disables public surfaces immediately and removes managed records.</p><div><a className="secondary-button button-link" href="/api/v1/export">Export JSON</a><button className="danger-button" onClick={deleteAccount}>Delete account</button></div></article></section>;
}
