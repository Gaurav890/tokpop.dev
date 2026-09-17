import { NextResponse } from 'next/server';

/** Complete a form-posted authorization decision with a browser GET callback. */
export function redirectToOAuthClient(target: URL) {
  return NextResponse.redirect(target, 303);
}

/** Return a verified callback URL so the browser can navigate to it explicitly with GET. */
export function oauthClientTarget(target: URL) {
  return NextResponse.json(
    { redirectTo: target.toString() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
