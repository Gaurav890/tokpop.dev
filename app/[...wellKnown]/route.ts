import { NextResponse } from 'next/server';
import { trustedOrigin } from '../../lib/oauth';

export async function GET(request: Request, { params }: { params: Promise<{ wellKnown: string[] }> }) {
  const { wellKnown } = await params;
  const path = wellKnown.join('/');
  const origin = trustedOrigin(request);
  if (path === '.well-known/oauth-protected-resource') return NextResponse.json({ resource: `${origin}/mcp`, authorization_servers: [origin], scopes_supported: ['profile:read', 'activity:write', 'stories:write'], resource_documentation: `${origin}/integrations/mcp` });
  if (path === '.well-known/oauth-authorization-server') return NextResponse.json({ issuer: origin, authorization_endpoint: `${origin}/oauth/authorize`, token_endpoint: `${origin}/oauth/token`, registration_endpoint: `${origin}/oauth/register`, response_types_supported: ['code'], grant_types_supported: ['authorization_code'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'], scopes_supported: ['profile:read', 'activity:write', 'stories:write'] });
  return NextResponse.json({ error: 'Not found.' }, { status: 404 });
}
