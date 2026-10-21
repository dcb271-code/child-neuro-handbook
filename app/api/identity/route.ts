// Remembers the picked name in a server-set cookie. See lib/identity/cookie.ts
// for why localStorage alone was not enough (Safari's seven-day purge).
//
// Not authentication: this cookie is a plain name and is never trusted for
// anything a password protects. It is deliberately *not* HttpOnly so the
// client hook can read it back to re-seed localStorage.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { identityByName } from '@/lib/roster';
import { NAME_COOKIE, NAME_COOKIE_MAX_AGE_S } from '@/lib/identity/cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const name = typeof body?.name === 'string' ? body.name : '';
  if (!identityByName(name)) {
    return NextResponse.json({ error: 'unknown name' }, { status: 400 });
  }
  // cookies().set() percent-encodes the value itself; parseNameCookie decodes once.
  cookies().set(NAME_COOKIE, name, {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: NAME_COOKIE_MAX_AGE_S,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  cookies().set(NAME_COOKIE, '', {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}
