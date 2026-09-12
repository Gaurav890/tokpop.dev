#!/usr/bin/env node
import { createHmac, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const VERSION = '0.1.0';
const configDir = join(homedir(), '.config', 'ai-native-profile');
const configFile = join(configDir, 'config.json');
const paths = {
  codex: [join(homedir(), '.codex', 'state_5.sqlite'), join(homedir(), '.codex', 'sessions')],
  claude_code: [join(homedir(), '.claude', 'stats-cache.json'), join(homedir(), '.claude', 'projects')],
  cursor: [join(homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb'), join(homedir(), '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb')],
  gemini_cli: [join(homedir(), '.gemini', 'tmp')],
  copilot_cli: [join(homedir(), '.copilot', 'session-state')],
};

const sourceNames = { codex: 'Codex', claude_code: 'Claude Code', cursor: 'Cursor', gemini_cli: 'Gemini CLI', copilot_cli: 'GitHub Copilot CLI' };
const detectedSources = () => Object.entries(paths).map(([source, candidates]) => ({ source, detected: candidates.some(existsSync) }));
const loadConfig = () => { try { return JSON.parse(readFileSync(configFile, 'utf8')); } catch { return {}; } };
const saveConfig = (value) => { mkdirSync(configDir, { recursive: true, mode: 0o700 }); writeFileSync(configFile, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }); };

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, child]) => child !== undefined).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function claudeAggregate() {
  const file = paths.claude_code.find((path) => path.endsWith('stats-cache.json') && existsSync(path));
  if (!file) return null;
  try {
    const stats = JSON.parse(readFileSync(file, 'utf8'));
    const tokenRows = new Map((stats.dailyModelTokens ?? []).map((row) => [row.date, Object.values(row.tokensByModel ?? {}).reduce((sum, value) => sum + Number(value || 0), 0)]));
    return (stats.dailyActivity ?? []).filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date ?? '')).map((row) => ({
      date: row.date, source: 'claude_code', category: 'coding',
      metrics: [
        ['sessions', row.sessionCount ?? 0], ['turns', row.messageCount ?? 0], ['tool_calls', row.toolCallCount ?? 0], ['tokens', tokenRows.get(row.date) ?? 0],
      ].filter(([, value]) => Number(value) > 0).map(([name, value]) => ({ name, value:Number(value), unit:'count', provenance:'local_exact', source:'claude_code', coverageStart:row.date, coverageEnd:row.date, competitiveEligible:true })),
    }));
  } catch { return null; }
}

function localFiles(candidates, limit = 300) {
  const files = [];
  const visit = (path) => {
    if (files.length >= limit || !existsSync(path)) return;
    let info; try { info = statSync(path); } catch { return; }
    if (info.isFile()) { if (/\.(jsonl|json)$/i.test(path)) files.push(path); return; }
    if (!info.isDirectory()) return;
    let entries = []; try { entries = readdirSync(path); } catch { return; }
    for (const entry of entries) visit(join(path, entry));
  };
  for (const path of candidates) visit(path);
  return files;
}

function genericLocalAggregate(source, candidates) {
  const rows = new Map();
  for (const file of localFiles(candidates)) {
    let content; try { content = readFileSync(file, 'utf8'); } catch { continue; }
    let events = [];
    try { const parsed = JSON.parse(content); events = Array.isArray(parsed) ? parsed : [parsed]; }
    catch { events = content.split(/\r?\n/).flatMap((line) => { try { return line.trim() ? [JSON.parse(line)] : []; } catch { return []; } }); }
    for (const event of events) {
      const stamp = event?.timestamp ?? event?.time ?? event?.created_at ?? event?.createdAt ?? event?.start_time;
      const instant = new Date(stamp);
      if (Number.isNaN(instant.getTime())) continue;
      const date = instant.toISOString().slice(0, 10);
      const name = String(event?.type ?? event?.event ?? event?.name ?? 'turn');
      const current = rows.get(date) ?? { sessions:0, turns:0, tools:0 };
      current.turns += 1;
      if (/session.*(start|create)|conversation.*start/i.test(name)) current.sessions += 1;
      if (/tool.*(call|use)|function.*call/i.test(name)) current.tools += 1;
      rows.set(date, current);
    }
  }
  return [...rows.entries()].sort().map(([date, row]) => ({ date, source, category:'coding', metrics:[['sessions', row.sessions], ['turns', row.turns], ['tool_calls', row.tools]].filter(([, value]) => value > 0).map(([name, value]) => ({ name, value, unit:'count', provenance:'local_derived', source, coverageStart:date, coverageEnd:date, competitiveEligible:true })) }));
}

async function cursorAggregate() {
  const database = paths.cursor.find(existsSync);
  if (!database) return [];
  try {
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(database, { readOnly:true });
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ItemTable WHERE lower(key) LIKE '%composer%' OR lower(key) LIKE '%ai%session%'`).get();
    db.close();
    const count = Number(row?.count ?? 0);
    if (!count) return [];
    const date = statSync(database).mtime.toISOString().slice(0, 10);
    return [{ date, source:'cursor', category:'coding', metrics:[{ name:'sessions', value:count, unit:'count', provenance:'estimated', source:'cursor', coverageStart:date, coverageEnd:date, competitiveEligible:false }] }];
  } catch { return []; }
}

async function codexAggregate() {
  const child = spawn('codex', ['app-server'], { stdio: ['pipe', 'pipe', process.env.ANP_DEBUG === '1' ? 'inherit' : 'ignore'] });
  const lines = createInterface({ input: child.stdout });
  const pending = new Map();
  lines.on('line', (line) => { try { const message = JSON.parse(line); if (typeof message.id === 'number') pending.get(message.id)?.(message); } catch {} });
  const request = (id, method, params = {}) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 8000);
    pending.set(id, (response) => { clearTimeout(timer); pending.delete(id); if (response.error) reject(new Error(response.error.message ?? `${method} failed`)); else resolve(response.result); });
    child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
  });
  try {
    await request(1, 'initialize', { clientInfo: { name:'ai_native_profile', title:'AI Native Profile', version:VERSION } });
    child.stdin.write(`${JSON.stringify({ method:'initialized', params:{} })}\n`);
    const usage = await request(2, 'account/usage/read');
    const buckets = usage?.dailyUsageBuckets ?? usage?.daily_usage_buckets ?? [];
    return buckets.flatMap((row) => {
      const date = row.startDate ?? row.start_date;
      const tokens = Number(row.tokens ?? row.tokenCount ?? row.token_count ?? 0);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !Number.isFinite(tokens) || tokens < 0) return [];
      return [{ date, source:'codex', category:'coding', metrics:[{ name:'tokens', value:tokens, unit:'count', provenance:'official_account_api', source:'codex', coverageStart:date, coverageEnd:date, competitiveEligible:true }] }];
    });
  } finally { child.kill('SIGTERM'); lines.close(); }
}

async function createBatch() {
  let codexDaily = [];
  try { codexDaily = await codexAggregate(); } catch (error) { if (process.env.ANP_DEBUG === '1') console.error(`Codex usage unavailable: ${error instanceof Error ? error.message : String(error)}`); }
  const daily = [...codexDaily, ...(claudeAggregate() ?? []), ...(await cursorAggregate()), ...genericLocalAggregate('gemini_cli', paths.gemini_cli), ...genericLocalAggregate('copilot_cli', paths.copilot_cli)];
  const dates = daily.map((day) => day.date).sort();
  const sources = [...new Set(daily.map((day) => day.source))];
  const batch = {
    schemaVersion:'anp.activity.v1', batchId:randomUUID(), deviceId:loadConfig().deviceId ?? randomUUID(), generatedAt:new Date().toISOString(), collectorVersion:VERSION,
    daily,
    coverage: sources.map((source) => { const sourceDays = daily.filter((day) => day.source === source); const sourceDates = sourceDays.map((day) => day.date).sort(); const competitiveEligible = sourceDays.some((day) => day.metrics.some((metric) => metric.competitiveEligible)); return { source, coverageStart:sourceDates[0] ?? dates[0], coverageEnd:sourceDates.at(-1) ?? dates.at(-1), lastSyncedAt:new Date().toISOString(), completeness:source === 'codex' || source === 'claude_code' ? 'full' : 'partial', competitiveEligible, note:source === 'cursor' ? 'Estimated from supported local database metadata; excluded from rankings.' : source === 'gemini_cli' || source === 'copilot_cli' ? 'Derived from locally retained CLI telemetry; prompt content is never emitted.' : undefined }; }),
    signature:'pending',
  };
  const secret = loadConfig().deviceToken ?? 'preview-only';
  batch.signature = createHmac('sha256', secret).update(canonicalJson({ ...batch, signature: undefined })).digest('base64url');
  return batch;
}

function printSources() {
  console.log('AI Native Profile source check\n');
  for (const item of detectedSources()) console.log(`${item.detected ? '●' : '○'} ${sourceNames[item.source].padEnd(20)} ${item.detected ? 'detected' : 'not detected'}`);
  console.log('\nOnly aggregate activity leaves this device. Run `anp preview` to inspect it.');
}

async function connect() {
  const apiUrl = process.env.ANP_API_URL;
  if (!apiUrl) {
    console.log('Set ANP_API_URL to your hosted AI Native Profile URL, then run this command again.');
    console.log('No provider credentials or activity were transmitted.');
    return;
  }
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/v1/device/pair`, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ deviceName:process.env.USER ?? 'Developer device', collectorVersion:VERSION }) });
  if (!response.ok) throw new Error(`Pairing failed (${response.status}).`);
  const pair = await response.json();
  saveConfig({ apiUrl, deviceId:pair.deviceId, deviceCode:pair.deviceCode, pairingCode:pair.userCode });
  console.log(`Open ${pair.verificationUrl} and enter ${pair.userCode}`);
  console.log('Waiting for approval (the code expires in 10 minutes)…');
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const tokenResponse = await fetch(`${apiUrl.replace(/\/$/, '')}/api/v1/device/token`, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ deviceId:pair.deviceId, deviceCode:pair.deviceCode }) });
    if (tokenResponse.status === 202) continue;
    const tokenBody = await tokenResponse.json().catch(() => ({}));
    if (tokenResponse.ok && tokenBody.deviceToken) {
      saveConfig({ apiUrl, deviceId:pair.deviceId, deviceToken:tokenBody.deviceToken });
      console.log('Connected. Automatic sync remains off until you run `anp watch`.');
      return;
    }
    throw new Error(tokenBody.error ?? `Pairing failed (${tokenResponse.status}).`);
  }
  throw new Error('Pairing code expired. Run `anp connect` again.');
}

async function sync() {
  const config = loadConfig();
  if (!config.apiUrl || !config.deviceToken) throw new Error('This device is not approved yet. Complete `anp connect` first.');
  const batch = await createBatch();
  const response = await fetch(`${config.apiUrl.replace(/\/$/, '')}/api/v1/metrics/batches`, { method:'POST', headers:{ 'content-type':'application/json', authorization:`Bearer ${config.deviceToken}` }, body:JSON.stringify(batch) });
  if (!response.ok) throw new Error(`Sync failed (${response.status}): ${await response.text()}`);
  console.log(`Synced ${batch.daily.length} aggregate day${batch.daily.length === 1 ? '' : 's'}.`);
}

function help() {
  console.log(`AI Native Profile collector ${VERSION}\n\nUsage: anp <command>\n\n  connect      Pair this device with the cloud dashboard\n  sources      Detect supported coding tools\n  preview      Print the exact aggregate payload\n  sync         Send one aggregate batch\n  watch        Sync every 15 minutes until stopped\n  doctor       Check configuration and sources\n  sessions     Explain selected-session sharing\n  share        Publish a selected sanitized session\n  unshare      Revoke a shared session\n  export       Alias for preview\n  disconnect   Remove the local platform pairing\n`);
}

function option(name) { const index = process.argv.indexOf(`--${name}`); return index >= 0 ? process.argv[index + 1] : undefined; }
async function shareSession() {
  const config = loadConfig(); if (!config.apiUrl || !config.deviceToken) throw new Error('Connect this device first.');
  const title = option('title') ?? ''; const summary = option('summary') ?? ''; const source = option('source') ?? 'codex'; const visibility = option('visibility') === 'public' ? 'public' : 'unlisted'; const tags = (option('tags') ?? '').split(',').map((tag) => tag.trim()).filter(Boolean);
  if (!title || !summary) throw new Error('Use --title "…" and --summary "…". Content is never inferred from session logs.');
  const preview = { source, title, summary, tags, visibility };
  console.log('Selected-session preview (this is the exact content that would be sent):\n'); console.log(JSON.stringify(preview, null, 2));
  if (!process.argv.includes('--confirm')) { console.log('\nNothing was sent. Re-run with --confirm after reviewing the preview.'); return; }
  const response = await fetch(`${config.apiUrl.replace(/\/$/, '')}/api/v1/stories`, { method:'POST', headers:{ 'content-type':'application/json', authorization:`Bearer ${config.deviceToken}` }, body:JSON.stringify(preview) }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error ?? `Publishing failed (${response.status}).`); console.log(`Published ${body.visibility}: ${body.url}`);
}
async function listSessions() { const config = loadConfig(); if (!config.apiUrl || !config.deviceToken) throw new Error('Connect this device first.'); const response = await fetch(`${config.apiUrl.replace(/\/$/, '')}/api/v1/stories`, { headers:{ authorization:`Bearer ${config.deviceToken}` } }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error ?? 'Could not list shared sessions.'); for (const story of body.stories ?? []) console.log(`${story.revoked_at ? 'revoked' : story.visibility}\t${story.id}\t${story.title}`); }
async function unshareSession() { const id = process.argv[3]; const config = loadConfig(); if (!id) throw new Error('Use `anp unshare <story-id>`.'); if (!config.apiUrl || !config.deviceToken) throw new Error('Connect this device first.'); const response = await fetch(`${config.apiUrl.replace(/\/$/, '')}/api/v1/stories/${encodeURIComponent(id)}`, { method:'DELETE', headers:{ authorization:`Bearer ${config.deviceToken}` } }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error ?? 'Revocation failed.'); console.log(`Revoked ${id}.`); }

const command = process.argv[2] ?? 'help';
try {
  if (command === 'help' || command === '--help' || command === '-h') help();
  else if (command === 'sources') printSources();
  else if (command === 'preview' || command === 'export') console.log(JSON.stringify(await createBatch(), null, 2));
  else if (command === 'connect') await connect();
  else if (command === 'sync') await sync();
  else if (command === 'watch') { await sync(); console.log('Watching every 15 minutes. Press Ctrl+C to stop.'); setInterval(() => sync().catch((error) => console.error(error.message)), 15 * 60 * 1000); }
  else if (command === 'doctor') { printSources(); const config = loadConfig(); console.log(`\nCloud pairing: ${config.deviceId ? 'configured' : 'not configured'}`); }
  else if (command === 'sessions') await listSessions();
  else if (command === 'share') await shareSession();
  else if (command === 'unshare') await unshareSession();
  else if (command === 'disconnect') { rmSync(configFile, { force:true }); console.log('Removed the local platform pairing. Provider sign-ins and source data were not changed.'); }
  else { console.error(`Unknown command: ${command}\n`); help(); process.exitCode = 1; }
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
