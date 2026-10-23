import { createReadStream } from 'node:fs';
import { basename, join } from 'node:path';
import { createInterface } from 'node:readline';
import { discoverLocalDataFiles } from './file-discovery.mjs';

const count = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const instant = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;

export function localUsageRoots(home, env = process.env) {
  const root = env.CODEX_HOME || join(home, '.codex');
  return [join(root, 'sessions'), join(root, 'archived_sessions')];
}

export function createUsageAccumulator() {
  return { sessions:new Map(), skipped:0 };
}

export function addUsageEvent(accumulator, file, event) {
  if (event?.type === 'session_meta') {
    file.id = event.payload?.id ?? event.payload?.session_id ?? file.id;
    file.started = instant(event.payload?.timestamp);
    return;
  }
  if (event?.type !== 'event_msg' || event.payload?.type !== 'token_count') return;
  const info = event.payload.info;
  if (!info) return;
  const time = instant(event.timestamp);
  const total = count(info.total_token_usage?.total_tokens);
  const last = count(info.last_token_usage?.total_tokens);
  if (time === null || total === null) { accumulator.skipped += 1; return; }
  // Keep only usage counters; message content and filesystem paths never enter the payload.
  const session = accumulator.sessions.get(file.id) ?? new Map();
  session.set(`${time}:${total}:${last}`, { time, total, last, inherited:file.started !== null && file.started !== undefined && time < file.started });
  accumulator.sessions.set(file.id, session);
}

export function finalizeUsage(accumulator) {
  const days = new Map();
  for (const session of accumulator.sessions.values()) {
    let previous = null;
    for (const event of [...session.values()].sort((a, b) => a.time - b.time || a.total - b.total)) {
      // First snapshots may include unretained or forked history. Count only the last
      // recorded request until we have a baseline. Repeated snapshots contribute zero.
      let delta = previous === null ? event.last : event.total - previous;
      if (delta !== null && delta < 0) delta = event.last;
      previous = event.total;
      if (event.inherited || delta === null || delta <= 0) continue;
      const date = new Date(event.time).toISOString().slice(0, 10);
      days.set(date, (days.get(date) ?? 0) + delta);
    }
  }
  return [...days.entries()].sort().map(([date, value]) => ({
    date, source:'codex', category:'coding', metrics:[{
      name:'tokens', value, unit:'count', provenance:'local_derived', source:'codex',
      coverageStart:date, coverageEnd:date, competitiveEligible:true,
    }],
  }));
}

export async function readLocalUsage(roots) {
  const discovery = discoverLocalDataFiles(roots);
  const accumulator = createUsageAccumulator();
  for (const path of discovery.files.filter((path) => path.endsWith('.jsonl'))) {
    const file = { id:basename(path), started:null };
    try {
      const lines = createInterface({ input:createReadStream(path, { encoding:'utf8' }), crlfDelay:Infinity });
      for await (const line of lines) {
        if (!line.trim()) continue;
        try { addUsageEvent(accumulator, file, JSON.parse(line)); }
        catch { accumulator.skipped += 1; }
      }
    } catch { accumulator.skipped += 1; }
  }
  return {
    daily:finalizeUsage(accumulator), completeness:'partial',
    note:'Derived from retained local session token counters, including archived sessions. Cached input and reasoning are already included in reported totals and are not added again. This is not complete account or lifetime coverage.'
      + (discovery.truncated ? ' File discovery reached its safety limit.' : '')
      + (accumulator.skipped ? ' Some unreadable or malformed local records were skipped.' : ''),
  };
}

export async function collectUsage({ readAccount, readLocal }) {
  let accountFailed = false;
  try {
    const daily = await readAccount();
    // Never add local counters to account totals: their scope can overlap.
    if (daily.length) return { daily, completeness:'full', note:'Account-reported daily usage; local session counters are not added.', fallback:false };
  } catch { accountFailed = true; }
  const local = await readLocal();
  if (!local.daily.length) throw new Error(accountFailed
    ? 'Account usage is unavailable and no retained local token records were found. Run this on the computer where you use the tool; check its data directory with sources.'
    : 'No account daily usage or retained local token records were found.');
  return { ...local, fallback:true };
}
