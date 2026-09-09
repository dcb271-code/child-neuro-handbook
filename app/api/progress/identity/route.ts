// Optional per-resident privacy: choose a pseudonym, and/or set a password so
// nobody else can select your name and read your scores.
//
// Claiming is first-come: the first person to set a password for a name owns
// it. There is no way to do better without real accounts, and the alternative
// (nobody can protect themselves) is worse. An admin can clear a claim — see
// DELETE — for the case where someone claims the wrong name or forgets.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { memberByName } from '@/lib/roster';
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  validatePseudonym,
  findCredential,
  protectedNames,
} from '@/lib/progress/identity';
import { readIdentities, writeIdentities } from '@/lib/progress/identityStore';
import {
  signIdentityCookie,
  verifiedResident,
  IDENTITY_COOKIE_NAME,
  IDENTITY_COOKIE_TTL_MS,
} from '@/lib/progress/identityAuth';
import { isProgressAdmin } from '@/lib/progress/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function setIdentityCookie(name: string, secret: string) {
  cookies().set(IDENTITY_COOKIE_NAME, signIdentityCookie(name, Date.now() + IDENTITY_COOKIE_TTL_MS, secret), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(IDENTITY_COOKIE_TTL_MS / 1000),
  });
}

/**
 * What the picker needs: who this browser is verified as, which names are
 * password-protected, and this resident's own pseudonym.
 *
 * Deliberately does not return other residents' pseudonyms — those arrive
 * already substituted in the redacted board.
 */
export async function GET() {
  let records;
  try {
    records = await readIdentities();
  } catch (err) {
    console.error('[progress/identity] read failed:', err);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const verified = verifiedResident();
  const mine = verified ? findCredential(records, verified) : undefined;
  return NextResponse.json({
    verified,
    protected: protectedNames(records),
    pseudonym: mine?.pseudonym ?? null,
    hasPassword: !!mine?.hash,
  });
}

export async function POST(req: Request) {
  const secret = process.env.RESOURCES_COOKIE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });
  }

  let body: { action?: string; name?: string; password?: string; newPassword?: string; pseudonym?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  let records;
  try {
    records = await readIdentities();
  } catch (err) {
    // Never fall through to "no records" — that would let a claim overwrite an
    // existing password.
    console.error('[progress/identity] read failed:', err);
    return NextResponse.json({ error: 'unavailable, try again' }, { status: 503 });
  }

  const action = body.action;

  // ── verify: prove you hold a protected name's password ───────────────
  if (action === 'verify') {
    const name = String(body.name ?? '');
    const cred = findCredential(records, name);
    if (!cred) return NextResponse.json({ error: 'that name has no password set' }, { status: 400 });
    if (typeof body.password !== 'string' || !verifyPassword(body.password, cred.salt, cred.hash)) {
      return NextResponse.json({ error: 'incorrect password' }, { status: 401 });
    }
    setIdentityCookie(name, secret);
    return NextResponse.json({ ok: true, verified: name });
  }

  // ── claim: set a password for a name that has none ───────────────────
  if (action === 'claim') {
    const name = String(body.name ?? '');
    if (!memberByName(name)) {
      return NextResponse.json({ error: 'unknown resident' }, { status: 400 });
    }
    const pwErr = validatePassword(body.password);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

    if (findCredential(records, name)) {
      return NextResponse.json(
        { error: 'that name already has a password; enter it instead' },
        { status: 409 },
      );
    }

    let pseudonym: string | undefined;
    if (body.pseudonym !== undefined && String(body.pseudonym).trim() !== '') {
      const psErr = validatePseudonym(body.pseudonym);
      if (psErr) return NextResponse.json({ error: psErr }, { status: 400 });
      pseudonym = String(body.pseudonym).trim();
    }

    const { salt, hash } = hashPassword(body.password as string);
    records.residents.push({ name, salt, hash, pseudonym, updatedAt: Date.now() });
    await writeIdentities(records);
    setIdentityCookie(name, secret);
    return NextResponse.json({ ok: true, verified: name });
  }

  // ── change password: needs the current one ───────────────────────────
  if (action === 'change-password') {
    const verified = verifiedResident();
    if (!verified) return NextResponse.json({ error: 'not verified' }, { status: 401 });
    const cred = findCredential(records, verified);
    if (!cred) return NextResponse.json({ error: 'no password set' }, { status: 400 });
    if (typeof body.password !== 'string' || !verifyPassword(body.password, cred.salt, cred.hash)) {
      return NextResponse.json({ error: 'current password is incorrect' }, { status: 401 });
    }
    const pwErr = validatePassword(body.newPassword);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

    const { salt, hash } = hashPassword(body.newPassword as string);
    cred.salt = salt;
    cred.hash = hash;
    cred.updatedAt = Date.now();
    await writeIdentities(records);
    setIdentityCookie(verified, secret);
    return NextResponse.json({ ok: true });
  }

  // ── pseudonym: set or clear your own display name ────────────────────
  if (action === 'pseudonym') {
    const name = String(body.name ?? '');
    const verified = verifiedResident();
    const cred = findCredential(records, name);

    // If the name is protected, only its holder may relabel it. If it isn't,
    // anyone selecting that name can — same trust level as the rest of
    // unprotected tracking.
    if (cred?.hash && verified !== name) {
      return NextResponse.json({ error: 'that name is password-protected' }, { status: 401 });
    }
    if (!memberByName(name)) {
      return NextResponse.json({ error: 'unknown resident' }, { status: 400 });
    }

    const clearing = body.pseudonym === undefined || String(body.pseudonym).trim() === '';
    if (!clearing) {
      const psErr = validatePseudonym(body.pseudonym);
      if (psErr) return NextResponse.json({ error: psErr }, { status: 400 });
    }
    const value = clearing ? undefined : String(body.pseudonym).trim();

    if (cred) cred.pseudonym = value;
    else records.residents.push({ name, salt: '', hash: '', pseudonym: value, updatedAt: Date.now() });
    await writeIdentities(records);
    return NextResponse.json({ ok: true, pseudonym: value ?? null });
  }

  // ── sign out of a verified identity ──────────────────────────────────
  if (action === 'signout') {
    cookies().delete(IDENTITY_COOKIE_NAME);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

/** Admin: clear a resident's password so they can claim it again. */
export async function DELETE(req: Request) {
  if (!isProgressAdmin()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const name = new URL(req.url).searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  let records;
  try {
    records = await readIdentities();
  } catch (err) {
    console.error('[progress/identity] read failed:', err);
    return NextResponse.json({ error: 'unavailable, try again' }, { status: 503 });
  }

  const cred = findCredential(records, name);
  if (!cred) return NextResponse.json({ error: 'no such claim' }, { status: 404 });

  // Keep any chosen pseudonym; only the password is being reset.
  cred.salt = '';
  cred.hash = '';
  cred.updatedAt = Date.now();
  await writeIdentities(records);
  return NextResponse.json({ ok: true, reset: name });
}
