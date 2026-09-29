import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/resources/auth';
import { validateNewEntry, type Entry, type NewEntry } from '@/lib/family-points/calculator';
import { readEntries, appendEntries, deleteEntry, newEntryId } from '@/lib/family-points/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BATCH = 50;

function requireAuth(): NextResponse | null {
  let authed = false;
  try {
    authed = isAuthed();
  } catch {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });
  }
  if (!authed) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return null;
}

export async function GET() {
  const entries = await readEntries();
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const denied = requireAuth();
  if (denied) return denied;

  let body: { entries?: NewEntry[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const incoming = body?.entries;
  if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > MAX_BATCH) {
    return NextResponse.json({ error: `entries must be an array of 1–${MAX_BATCH}` }, { status: 400 });
  }
  for (const e of incoming) {
    const err = validateNewEntry(e);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  const now = Date.now();
  const added: Entry[] = incoming.map((e) => ({
    id: newEntryId(),
    member: e.member,
    taskId: e.taskId,
    month: e.month,
    count: e.count,
    createdAt: now,
  }));
  try {
    await appendEntries(added);
  } catch (err) {
    console.error('[family-points] appendEntries failed:', err);
    return NextResponse.json({ error: 'could not save, try again' }, { status: 503 });
  }

  return NextResponse.json({ ok: true, added: added.length });
}

export async function DELETE(req: Request) {
  const denied = requireAuth();
  if (denied) return denied;

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  if (!body?.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  let found: boolean;
  try {
    found = await deleteEntry(body.id);
  } catch (err) {
    console.error('[family-points] deleteEntry failed:', err);
    return NextResponse.json({ error: 'could not save, try again' }, { status: 503 });
  }
  if (!found) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
