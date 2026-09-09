// Admin session for the progress board: POST a password to see real names,
// DELETE to step back down to the redacted view.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  signAdminCookie,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_TTL_MS,
  isProgressAdmin,
} from '@/lib/progress/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ admin: isProgressAdmin() });
}

export async function POST(req: Request) {
  const password = process.env.PROGRESS_ADMIN_PASSWORD;
  const secret = process.env.RESOURCES_COOKIE_SECRET;
  if (!password || !secret) {
    // Fails closed on purpose — an unset password must not mean "no password".
    return NextResponse.json({ error: 'admin view is not configured' }, { status: 503 });
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

  cookies().set(ADMIN_COOKIE_NAME, signAdminCookie(Date.now() + ADMIN_COOKIE_TTL_MS, secret), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(ADMIN_COOKIE_TTL_MS / 1000),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  cookies().delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
