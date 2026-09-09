import { NextResponse } from 'next/server';
import {
  validateNewAttempt,
  MAX_ATTEMPT_BATCH,
  type Attempt,
  type NewAttempt,
} from '@/lib/progress/calculator';
import { computeProgress } from '@/lib/progress/calculator';
import { redactBoard } from '@/lib/progress/privacy';
import { isProgressAdmin } from '@/lib/progress/adminAuth';
import { readAttempts, writeAttempts, newAttemptId } from '@/lib/progress/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// No password gate here, unlike /api/family-points/entries. Identity itself
// is just a name picked client-side (see lib/identity/useIdentity.ts) — this
// is self-tracking, not a competitive scoring system, so the same "very
// simply" tradeoff applies one level further: no barrier to logging your own
// quiz attempts at all.

// Returns a computed board, never the raw attempt log.
//
// It used to return every attempt with real names to any caller, which meant
// any redaction in the UI was decoration — the JSON was one URL away. The board
// is now assembled and redacted here, so a resident's browser is never sent the
// mapping from another resident to their scores.
//
// `?as=` is the caller's claimed identity. It is spoofable, because identity is
// a picked name rather than a login; what it buys is that seeing the whole
// roster at once now needs the admin password, not just a different selection
// in the dropdown.
export async function GET(req: Request) {
  const attempts = await readAttempts();
  const admin = isProgressAdmin();
  const viewer = new URL(req.url).searchParams.get('as');
  const board = redactBoard(computeProgress(attempts), viewer, admin);
  return NextResponse.json({ board, admin });
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
