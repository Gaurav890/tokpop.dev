import { NextResponse } from 'next/server';
import { trustedOrigin } from '../../../lib/oauth';

export async function GET(request: Request) {
  const origin = trustedOrigin(request);
  return NextResponse.json({ resource: `${origin}/mcp`, authorization_servers: [origin], scopes_supported: ['profile:read', 'activity:write', 'stories:write'], resource_documentation: `${origin}/integrations/mcp` });
}
