import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

export const BACKGROUND_INTERVAL_SECONDS = 15 * 60;
export const BACKGROUND_LABEL = 'dev.ainativeprofile.sync';

function xml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function systemdQuote(value) {
  return `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

export function backgroundSyncPaths({ homeDir = homedir(), platform = process.platform } = {}) {
  const configDir = join(homeDir, '.config', 'ai-native-profile');
  const collectorRoot = join(configDir, 'collector');
  if (platform === 'darwin') {
    return {
      configDir,
      collectorRoot,
      definition: join(homeDir, 'Library', 'LaunchAgents', `${BACKGROUND_LABEL}.plist`),
      log: join(configDir, 'sync.log'),
    };
  }
  if (platform === 'linux') {
    const systemdDir = join(homeDir, '.config', 'systemd', 'user');
    return {
      configDir,
      collectorRoot,
      definition: join(systemdDir, 'ai-native-profile-sync.timer'),
      serviceDefinition: join(systemdDir, 'ai-native-profile-sync.service'),
      log: null,
    };
  }
  return { configDir, collectorRoot, definition: null, serviceDefinition: null, log: null };
}

export function renderLaunchAgent({ nodePath, cliPath, logPath, environment = {}, intervalSeconds = BACKGROUND_INTERVAL_SECONDS }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${BACKGROUND_LABEL}</string>
  <key>ProgramArguments</key>
  <array><string>${xml(nodePath)}</string><string>${xml(cliPath)}</string><string>sync</string><string>--background</string></array>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>${intervalSeconds}</integer>
  <key>ProcessType</key><string>Background</string>
  <key>EnvironmentVariables</key><dict>${Object.entries(environment).map(([key, value]) => `<key>${xml(key)}</key><string>${xml(value)}</string>`).join('')}</dict>
  <key>StandardOutPath</key><string>${xml(logPath)}</string>
  <key>StandardErrorPath</key><string>${xml(logPath)}</string>
</dict>
</plist>
`;
}

export function renderSystemdUnits({ nodePath, cliPath, environment = {}, intervalSeconds = BACKGROUND_INTERVAL_SECONDS }) {
  const service = `[Unit]
Description=Refresh AI Native Profile aggregates

[Service]
Type=oneshot
${Object.entries(environment).map(([key, value]) => `Environment=${systemdQuote(`${key}=${value}`).replaceAll('%', '%%')}`).join('\n')}
ExecStart=${systemdQuote(nodePath)} ${systemdQuote(cliPath)} sync --background
`;
  const timer = `[Unit]
Description=Refresh AI Native Profile every 15 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=${intervalSeconds}s
Persistent=true

[Install]
WantedBy=timers.target
`;
  return { service, timer };
}

function run(command, args, { allowFailure = false, runner = spawnSync } = {}) {
  const result = runner(command, args, { encoding: 'utf8', stdio: 'pipe' });
  if (!allowFailure && (result.error || result.status !== 0)) {
    const detail = result.error?.message ?? String(result.stderr || result.stdout || `exit ${result.status}`).trim();
    throw new Error(`${command} failed: ${detail}`);
  }
  return result;
}

function installCollectorBundle({ sourceRoot, collectorRoot }) {
  const files = [
    ['bin/anp.mjs', 'bin/anp.mjs'],
    ['src/background-sync.mjs', 'src/background-sync.mjs'],
    ['src/claude-usage.mjs', 'src/claude-usage.mjs'],
    ['src/codex-executable.mjs', 'src/codex-executable.mjs'],
    ['src/codex-usage.mjs', 'src/codex-usage.mjs'],
    ['src/file-discovery.mjs', 'src/file-discovery.mjs'],
    ['src/open-browser.mjs', 'src/open-browser.mjs'],
  ];
  for (const [source, destination] of files) {
    const target = join(collectorRoot, destination);
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    copyFileSync(join(sourceRoot, source), target);
  }
  return join(collectorRoot, 'bin', 'anp.mjs');
}

export function installBackgroundSync({
  sourceRoot,
  homeDir = homedir(),
  platform = process.platform,
  nodePath = process.execPath,
  uid = typeof process.getuid === 'function' ? process.getuid() : null,
  runner = spawnSync,
  environment = { PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin' },
} = {}) {
  if (!sourceRoot) throw new Error('The collector source directory is required.');
  if (!['darwin', 'linux'].includes(platform)) {
    return { installed: false, platform, reason: 'Automatic background sync currently supports macOS and Linux.' };
  }
  const paths = backgroundSyncPaths({ homeDir, platform });
  const cliPath = installCollectorBundle({ sourceRoot, collectorRoot: paths.collectorRoot });
  mkdirSync(paths.configDir, { recursive: true, mode: 0o700 });

  if (platform === 'darwin') {
    if (uid === null) throw new Error('Could not determine the current macOS user.');
    mkdirSync(dirname(paths.definition), { recursive: true });
    writeFileSync(paths.definition, renderLaunchAgent({ nodePath, cliPath, logPath: paths.log, environment }), { mode: 0o600 });
    const domain = `gui/${uid}`;
    run('launchctl', ['bootout', `${domain}/${BACKGROUND_LABEL}`], { allowFailure: true, runner });
    run('launchctl', ['bootstrap', domain, paths.definition], { runner });
    return { installed: true, platform, intervalSeconds: BACKGROUND_INTERVAL_SECONDS, definition: paths.definition };
  }

  if (platform === 'linux') {
    mkdirSync(dirname(paths.definition), { recursive: true, mode: 0o700 });
    const units = renderSystemdUnits({ nodePath, cliPath, environment });
    writeFileSync(paths.serviceDefinition, units.service, { mode: 0o600 });
    writeFileSync(paths.definition, units.timer, { mode: 0o600 });
    run('systemctl', ['--user', 'daemon-reload'], { runner });
    run('systemctl', ['--user', 'enable', '--now', basename(paths.definition)], { runner });
    return { installed: true, platform, intervalSeconds: BACKGROUND_INTERVAL_SECONDS, definition: paths.definition };
  }
}

export function uninstallBackgroundSync({
  homeDir = homedir(),
  platform = process.platform,
  uid = typeof process.getuid === 'function' ? process.getuid() : null,
  runner = spawnSync,
} = {}) {
  const paths = backgroundSyncPaths({ homeDir, platform });
  if (platform === 'darwin' && paths.definition) {
    if (uid !== null) run('launchctl', ['bootout', `gui/${uid}/${BACKGROUND_LABEL}`], { allowFailure: true, runner });
    rmSync(paths.definition, { force: true });
  } else if (platform === 'linux' && paths.definition) {
    run('systemctl', ['--user', 'disable', '--now', basename(paths.definition)], { allowFailure: true, runner });
    rmSync(paths.definition, { force: true });
    rmSync(paths.serviceDefinition, { force: true });
    run('systemctl', ['--user', 'daemon-reload'], { allowFailure: true, runner });
  }
  rmSync(paths.collectorRoot, { recursive: true, force: true });
  return { installed: false, platform };
}

export async function runWithSyncState(task, { homeDir = homedir(), background = false, now = () => new Date() } = {}) {
  const { configDir } = backgroundSyncPaths({ homeDir });
  mkdirSync(configDir, { recursive: true, mode: 0o700 });
  const file = join(configDir, background ? 'background-status.json' : 'sync-status.json');
  let previous = {};
  try { previous = JSON.parse(readFileSync(file, 'utf8')) ?? {}; } catch {}
  const state = { lastAttemptAt: now().toISOString(), lastSuccessAt: previous.lastSuccessAt ?? null, result: 'running' };
  const save = () => writeFileSync(file, JSON.stringify(state), { mode: 0o600 });
  save();
  try {
    const result = await task();
    state.lastSuccessAt = now().toISOString();
    state.result = result?.warnings?.length ? 'partial' : 'success';
    state.skippedSources = result?.warnings ?? [];
    save();
    return result;
  } catch (error) {
    state.result = 'failed';
    save();
    throw error;
  }
}

export function backgroundSyncStatus({ homeDir = homedir(), platform = process.platform, uid = typeof process.getuid === 'function' ? process.getuid() : null, runner = spawnSync, now = Date.now() } = {}) {
  const paths = backgroundSyncPaths({ homeDir, platform });
  if (!paths.definition) return { supported: false, installed: false, platform };
  const installed = existsSync(paths.definition);
  const service = installed ? runner(platform === 'darwin' ? 'launchctl' : 'systemctl', platform === 'darwin' ? ['print', `gui/${uid}/${BACKGROUND_LABEL}`] : ['--user', 'is-active', basename(paths.definition)], { encoding: 'utf8', timeout: 5000 }) : null;
  const scheduled = service?.status === 0 && !service.error;
  let state = {};
  try { state = JSON.parse(readFileSync(join(paths.configDir, 'background-status.json'), 'utf8')) ?? {}; } catch {}
  const age = now - Date.parse(state.lastSuccessAt ?? '');
  const health = !installed ? 'off' : !scheduled ? 'not loaded' : state.result === 'failed' ? 'failed' : !Number.isFinite(age) ? 'not yet verified' : age < 0 || age > BACKGROUND_INTERVAL_SECONDS * 3 * 1000 ? 'stale' : state.result === 'running' ? 'in progress' : state.result === 'partial' ? 'partial' : state.result === 'success' ? 'healthy' : 'not yet verified';
  return {
    supported: true,
    installed,
    scheduled,
    health,
    lastAttemptAt: state.lastAttemptAt ?? null,
    lastSuccessAt: state.lastSuccessAt ?? null,
    skippedSources: state.skippedSources ?? [],
    platform,
    definition: paths.definition,
    intervalSeconds: BACKGROUND_INTERVAL_SECONDS,
  };
}

export function readBackgroundLog({ homeDir = homedir(), platform = process.platform } = {}) {
  const { log } = backgroundSyncPaths({ homeDir, platform });
  if (!log || !existsSync(log)) return '';
  return readFileSync(log, 'utf8');
}
