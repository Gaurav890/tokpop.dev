import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

type RpcResponse = { id?: number; result?: unknown; error?: { message?: string } };

export async function readCodexAccountUsage(timeoutMs = 8_000): Promise<unknown> {
  const child = spawn('codex', ['app-server'], { stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = createInterface({ input: child.stdout });
  const pending = new Map<number, (response: RpcResponse) => void>();
  lines.on('line', (line) => {
    try {
      const message = JSON.parse(line) as RpcResponse;
      if (typeof message.id === 'number') pending.get(message.id)?.(message);
    } catch { /* Ignore diagnostics that are not JSON-RPC. */ }
  });
  const request = (id: number, method: string, params: object = {}) => new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Codex App Server timed out during ${method}.`)), timeoutMs);
    pending.set(id, (response) => {
      clearTimeout(timer);
      pending.delete(id);
      if (response.error) reject(new Error(response.error.message ?? `${method} failed.`));
      else resolve(response.result);
    });
    child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
  });
  try {
    await request(1, 'initialize', { clientInfo: { name: 'ai_native_profile', title: 'AI Native Profile', version: '0.1.0' } });
    child.stdin.write(`${JSON.stringify({ method: 'initialized', params: {} })}\n`);
    return await request(2, 'account/usage/read');
  } finally {
    child.kill('SIGTERM');
    lines.close();
  }
}
