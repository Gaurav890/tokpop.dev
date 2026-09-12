import type { ActivityBatch } from '@ai-native-profile/schema';
import { validateActivityBatch } from '@ai-native-profile/schema';

const forbiddenKey = /(^|_)(prompt|response|content|source_code|tool_args?|tool_outputs?|shell_command|repo(sitory)?|file_path|session_title|email|cookie|credential|access_token|refresh_token|environment|env_var)(_|$)/i;
const suspiciousSecret = /(sk-[A-Za-z0-9_-]{16,}|gh[opusr]_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/;

function inspect(value: unknown, path: string, problems: string[]) {
  if (typeof value === 'string' && suspiciousSecret.test(value)) problems.push(`${path} resembles a credential.`);
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = path ? `${path}.${key}` : key;
    if (forbiddenKey.test(key)) problems.push(`${next} is not allowed in aggregate synchronization.`);
    inspect(child, next, problems);
  }
}

export function privacyCheck(value: unknown): { ok: true; batch: ActivityBatch } | { ok: false; errors: string[] } {
  const validation = validateActivityBatch(value);
  if (!validation.ok) return validation;
  const problems: string[] = [];
  inspect(validation.value, '', problems);
  return problems.length ? { ok: false, errors: [...new Set(problems)] } : { ok: true, batch: validation.value };
}
