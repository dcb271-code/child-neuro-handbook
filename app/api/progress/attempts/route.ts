import { NextResponse } from 'next/server';
import {
  validateNewAttempt,
  MAX_ATTEMPT_BATCH,
  computeProgress,
  type Attempt,
  type NewAttempt,
} from '@/lib/progress/calculator';
import { redactBoard, resolveViewer } from '@/lib/progress/privacy';
import { isProgressAdmin } from '@/lib/progress/adminAuth';
import { verifiedResident } from '@/lib/progress/identityAuth';
import { findCredential, pseudonymMap, type IdentityRecords } from '@/lib/progress/identityLimits';
import { readIdentities } from '@/lib/progress/identityStore';
import { readAttempts, writeAttempts, newAttemptId } from '@/lib/progress/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Logging an attempt needs no password, unlike /api/family-points/entries —
// this is self-tracking, not competitive scoring. The one exception is a name
// whose owner has set a password: see requireOwnership below.

export async function GET(req: Request) {
  const admin = isProgressAdmin();
  const claimed = new URL(req.url).searchParams.get('as');
  const verified = verifiedResident();

  let records: IdentityRecords;
  try {
    records = await readIdentities();
  } catch (err) {
    // Deny rather than degrade: empty records would read as "nobody is
    // protected" and hand out every protected row.
    console.error('[progress] readIdentities failed:', err);
    if (!admin) return NextResponse.json({ error: 'unavailable, try again' }, { status: 503 });
    records = { residents: [] };
  }

  const attempts = await readAttempts();
  const viewer = admin ? verified : resolveViewer(records, claimed, verified);
  const board = redactBoard(computeProgress(attempts), viewer, admin, pseudonymMap(records));

  return NextResponse.json({ board, admin, viewer, protectedName: !!(viewer && findCredential(records, viewer)?.hash) });
}

export async function POST(req: Request) {
  let body: { attempts?: NewAttempt[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const incoming = body?.attempts;
  if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > MAX_ATTEMPT_BATCH) {
    return NextResponse.json({ error: `attempts must be an array of 1–${MAX_ATTEMPT_BATCH}` }, { status: 400 });
  }
  for (const a of incoming) {
    const err = validateNewAttempt(a);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  // A protected name may only be written to by its holder — otherwise anyone
  // could pad or poison a colleague's stats even though they can't read them.
  const members = new Set(incoming.map((a) => a.member));
  let records: IdentityRecords;
  try {
    records = await readIdentities();
  } catch (err) {
    console.error('[progress] readIdentities failed:', err);
    return NextResponse.json({ error: 'unavailable, try again' }, { status: 503 });
  }
  const verified = verifiedResident();
  for (const m of members) {
    if (findCredential(records, m)?.hash && verified !== m) {
      return NextResponse.json({ error: `${m} is password-protected on this site` }, { status: 403 });
    }
  }

  const existing = await readAttempts();
  const now = Date.now();
  const added: Attempt[] = incoming.map((a) => ({
    id: newAttemptId(),
    member: a.member,
    quiz: a.quiz,
    questionId: a.questionId,
    correct: a.correct,
    createdAt: now,
  }));
  await writeAttempts([...existing, ...added]);

  return NextResponse.json({ ok: true, added: added.length });
}
