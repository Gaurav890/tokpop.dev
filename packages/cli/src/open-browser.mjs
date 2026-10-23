import { spawn } from 'node:child_process';

export async function openApprovalBrowser(value, {
  allowedOrigin,
  disabled = false,
  interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY),
  platform = process.platform,
  env = process.env,
  spawnProcess = spawn,
  timeoutMs = 3000,
} = {}) {
  if (disabled || !interactive || env.SSH_CONNECTION || env.SSH_TTY || env.CI) return false;
  let url;
  try {
    url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) return false;
    if (!allowedOrigin || url.origin !== new URL(allowedOrigin).origin) return false;
  } catch { return false; }
  const commands = {
    darwin: ['open', [url.href]],
    win32: ['rundll32.exe', ['url.dll,FileProtocolHandler', url.href]],
    linux: ['xdg-open', [url.href]],
  };
  const command = commands[platform];
  if (!command) return false;
  return new Promise((resolve) => {
    let timer;
    const finish = (opened) => { clearTimeout(timer); resolve(opened); };
    try {
      const child = spawnProcess(command[0], command[1], { stdio: 'ignore', detached: true, windowsHide: true, shell: false });
      timer = setTimeout(() => finish(false), timeoutMs);
      child.once('error', () => finish(false));
      child.once('exit', (code) => finish(code === 0));
      child.unref();
    } catch { finish(false); }
  });
}
