import { NextResponse } from 'next/server';
import {
  validateNewAttempt,
  MAX_ATTEMPT_BATCH,
  type Attempt,
  type NewAttempt,
} from '@/lib/progress/calculator';
import { readAttempts, writeAttempts, newAttemptId } from '@/lib/progress/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// No password gate here, unlike /api/family-points/entries. Identity itself
// is just a name picked client-side (see lib/identity/useIdentity.ts) — this
// is self-tracking, not a competitive scoring system, so the same "very
// simply" tradeoff applies one level further: no barrier to logging your own
// quiz attempts at all.

export async function GET() {
  const attempts = await readAttempts();
  return NextResponse.json({ attempts });
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
