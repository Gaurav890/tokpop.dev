import { NextRequest, NextResponse } from 'next/server';
import { createClientId } from '../../../lib/oauth';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { redirect_uris?: string[]; client_name?: string };
  if (!Array.isArray(body.redirect_uris) || !body.redirect_uris.length || body.redirect_uris.some((uri) => {
    try {
      const parsed = new URL(uri);
      return parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname));
    } catch { return true; }
  })) {
    return NextResponse.json({ error: 'invalid_client_metadata', error_description: 'At least one valid redirect URI is required.' }, { status: 400 });
  }
  let clientId: string;
  try { clientId = await createClientId({ redirect_uris: body.redirect_uris, client_name: body.client_name }); }
  catch { return NextResponse.json({ error: 'temporarily_unavailable', error_description: 'OAuth signing is not configured.' }, { status: 503 }); }
  return NextResponse.json({ client_id: clientId, client_id_issued_at: Math.floor(Date.now() / 1000), redirect_uris: body.redirect_uris, client_name: body.client_name, token_endpoint_auth_method: 'none' }, { status: 201 });
}
