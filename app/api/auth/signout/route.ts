import { NextRequest, NextResponse } from 'next/server';
import { sessionCookieName } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, '', { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: 0 });
  return response;
}
