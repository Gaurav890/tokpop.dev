import { accessSync, constants } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

/**
 * @param {{ env?: Record<string, string | undefined>; platform?: NodeJS.Platform; home?: string }} [options]
 */
export function codexExecutableCandidates({ env = process.env, platform = process.platform, home = homedir() } = {}) {
  const names = platform === 'win32' ? ['codex.exe', 'codex.cmd', 'codex.bat', 'codex'] : ['codex'];
  const pathCandidates = String(env.PATH ?? '').split(delimiter).filter(Boolean).flatMap((directory) => names.map((name) => join(directory, name)));
  const appCandidates = platform === 'darwin' ? [
    '/Applications/ChatGPT.app/Contents/Resources/codex',
    '/Applications/Codex.app/Contents/Resources/codex',
    join(home, 'Applications', 'ChatGPT.app', 'Contents', 'Resources', 'codex'),
    join(home, 'Applications', 'Codex.app', 'Contents', 'Resources', 'codex'),
  ] : [];
  return [...new Set([env.ANP_CODEX_PATH, ...pathCandidates, ...appCandidates].filter(Boolean))];
}

/**
 * @param {{ env?: Record<string, string | undefined>; platform?: NodeJS.Platform; home?: string; canExecute?: (candidate: string) => boolean }} [options]
 */
export function resolveCodexExecutable(options = {}) {
  const platform = options.platform ?? process.platform;
  const canExecute = options.canExecute ?? ((candidate) => {
    try {
      accessSync(candidate, platform === 'win32' ? constants.F_OK : constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
  return codexExecutableCandidates(options).find(canExecute) ?? null;
}
