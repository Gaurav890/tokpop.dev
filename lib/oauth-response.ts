import { NextResponse } from 'next/server';

/** Complete a form-posted authorization decision with a browser GET callback. */
export function redirectToOAuthClient(target: URL) {
  return NextResponse.redirect(target, 303);
}
