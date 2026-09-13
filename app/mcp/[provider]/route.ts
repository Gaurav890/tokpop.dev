import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../db/ensure';
import { authenticateMcp, containsSecret, hasScope } from '../../../lib/mcp';
import { trustedOrigin } from '../../../lib/oauth';

type RpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };

const textResult = (value: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value });
const jsonRpc = (id: RpcRequest['id'], result: unknown, status = 200) => NextResponse.json({ jsonrpc: '2.0', id: id ?? null, result }, { status });
const jsonRpcError = (id: RpcRequest['id'], code: number, message: string, status = 200) => NextResponse.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { status });

const tools = [
  { name: 'get_profile', description: 'Read the connected user’s AI Native Profile summary and public profile URL.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'record_session', description: 'Record one provider-observed conversation session. This never affects competitive scores.', inputSchema: { type: 'object', properties: { occurredAt: { type: 'string', description: 'Optional ISO-8601 timestamp.' } }, additionalProperties: false } },
  { name: 'publish_session', description: 'Publish a deliberately selected, sanitized session summary. Unlisted by default.', inputSchema: { type: 'object', required: ['title', 'summary'], properties: { title: { type: 'string', maxLength: 120 }, summary: { type: 'string', maxLength: 2000 }, tags: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 30 } }, visibility: { type: 'string', enum: ['unlisted', 'public'] }, expiresAt: { type: 'string' } }, additionalProperties: false } },
  { name: 'create_share_card', description: 'Create stable card and profile links for the connected GitHub identity.', inputSchema: { type: 'object', properties: { theme: { type: 'string', enum: ['dark', 'light'] } }, additionalProperties: false } },
];

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!['chatgpt', 'claude'].includes(provider)) return NextResponse.json({ error: 'Unknown MCP provider surface.' }, { status: 404 });
  const identity = await authenticateMcp(request);
  if (!identity) {
    const resource = `${trustedOrigin(request)}/.well-known/oauth-protected-resource`;
    return NextResponse.json({ error: 'authorization_required' }, { status: 401, headers: { 'www-authenticate': `Bearer resource_metadata="${resource}"` } });
  }
  const rpc = await request.json().catch(() => null) as RpcRequest | null;
  if (!rpc || rpc.jsonrpc !== '2.0' || !rpc.method) return jsonRpcError(rpc?.id, -32600, 'Invalid JSON-RPC request.', 400);
  if (rpc.method === 'initialize') return jsonRpc(rpc.id, { protocolVersion: '2025-06-18', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'AI Native Profile', version: '0.1.0' } });
  if (rpc.method === 'notifications/initialized') return new NextResponse(null, { status: 202 });
  if (rpc.method === 'tools/list') return jsonRpc(rpc.id, { tools });
  if (rpc.method !== 'tools/call') return jsonRpcError(rpc.id, -32601, 'Method not found.');

  const toolName = rpc.params?.name ?? '';
  const input = rpc.params?.arguments ?? {};
  if (!tools.some((tool) => tool.name === toolName)) return jsonRpcError(rpc.id, -32602, 'Unknown tool.');
  const requiredScope = toolName === 'get_profile' || toolName === 'create_share_card' ? 'profile:read' : toolName === 'record_session' ? 'activity:write' : 'stories:write';
  if (!hasScope(identity, requiredScope)) return jsonRpcError(rpc.id, -32003, `Missing OAuth scope: ${requiredScope}`);
  await ensureDb();
  const source = provider === 'chatgpt' ? 'chatgpt_web' : 'claude_web';
  const observedAt = typeof input.occurredAt === 'string' && !Number.isNaN(Date.parse(input.occurredAt)) ? input.occurredAt : new Date().toISOString();
  await env.DB.prepare(`INSERT INTO mcp_events (id,user_id,source,tool_name,observed_at) VALUES (?,?,?,?,?)`).bind(crypto.randomUUID(), identity.userId, source, toolName, observedAt).run();

  if (toolName === 'get_profile') {
    const user = await env.DB.prepare(`SELECT public_enabled, conversation_enabled FROM users WHERE id=?`).bind(identity.userId).first<{ public_enabled: number; conversation_enabled: number }>();
    return jsonRpc(rpc.id, textResult({ github: identity.login, verified: true, publicProfile: user?.public_enabled ? `${trustedOrigin(request)}/u/${identity.login}` : null, visibility: user?.public_enabled ? 'public' : 'private', conversationSectionEnabled: Boolean(user?.conversation_enabled), coverageNote: 'MCP observes only explicit tool invocations and does not represent complete history.' }));
  }
  if (toolName === 'record_session') {
    const date = new Date(observedAt).toISOString().slice(0, 10);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO daily_metrics (user_id,date,source,category,metric_name,value,unit,provenance,competitive_eligible) VALUES (?,?,?,?,?,1,'count','mcp_observed',0) ON CONFLICT(user_id,date,source,metric_name,provenance) DO UPDATE SET value=value+1`).bind(identity.userId, date, source, 'conversation', 'sessions'),
      env.DB.prepare(`INSERT INTO source_coverage (user_id,source,coverage_start,coverage_end,last_synced_at,completeness,competitive_eligible,note) VALUES (?,?,?,?,?,'partial',0,?) ON CONFLICT(user_id,source) DO UPDATE SET coverage_start=min(coverage_start,excluded.coverage_start),coverage_end=max(coverage_end,excluded.coverage_end),last_synced_at=excluded.last_synced_at,note=excluded.note`).bind(identity.userId, source, date, date, new Date().toISOString(), 'Explicit MCP observations only; not complete provider history.'),
    ]);
    return jsonRpc(rpc.id, textResult({ recorded: true, source, occurredAt: observedAt, competitiveEligible: false }));
  }
  if (toolName === 'publish_session') {
    const title = String(input.title ?? '').trim().slice(0, 120);
    const summary = String(input.summary ?? '').trim().slice(0, 2000);
    if (!title || !summary) return jsonRpcError(rpc.id, -32602, 'title and summary are required.');
    if (containsSecret(`${title}\n${summary}`)) return jsonRpcError(rpc.id, -32010, 'Potential secret detected. Remove credentials before publishing.');
    const tags = Array.isArray(input.tags) ? input.tags.map(String).map((tag) => tag.slice(0, 30)).slice(0, 8) : [];
    const visibility = input.visibility === 'public' ? 'public' : 'unlisted';
    const expiresAt = typeof input.expiresAt === 'string' && !Number.isNaN(Date.parse(input.expiresAt)) ? input.expiresAt : null;
    const id = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO session_stories (id,user_id,source,title,summary,tags_json,visibility,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id, identity.userId, source, title, summary, JSON.stringify(tags), visibility, expiresAt, new Date().toISOString()).run();
    return jsonRpc(rpc.id, textResult({ published: true, visibility, url: `${trustedOrigin(request)}/stories/${id}`, expiresAt }));
  }
  const theme = input.theme === 'light' ? 'light' : 'dark';
  return jsonRpc(rpc.id, textResult({ profileUrl: `${trustedOrigin(request)}/u/${identity.login}`, cardUrl: `${trustedOrigin(request)}/api/v1/cards/${identity.login}?theme=${theme}`, markdown: `![AI Native Profile](${trustedOrigin(request)}/api/v1/cards/${identity.login}?theme=${theme})` }));
}

export async function GET() {
  return NextResponse.json({ name: 'AI Native Profile MCP', transport: 'Streamable HTTP', providers: ['chatgpt', 'claude'] });
}
