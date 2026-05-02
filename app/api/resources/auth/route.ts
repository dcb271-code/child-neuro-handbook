import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signCookie, COOKIE_NAME, COOKIE_TTL_MS } from '@/lib/resources/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const password = process.env.RESOURCES_PASSWORD;
  const secret = process.env.RESOURCES_COOKIE_SECRET;
  if (!password || !secret) {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  if (body?.password !== password) {
    return NextResponse.json({ error: 'incorrect password' }, { status: 401 });
  }

  const expiry = Date.now() + COOKIE_TTL_MS;
  const value = signCookie(expiry, secret);

  cookies().set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(COOKIE_TTL_MS / 1000),
  });

  return NextResponse.json({ ok: true });
}
