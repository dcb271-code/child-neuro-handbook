import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/resources/auth';
import { validateUrl, validateShortString } from '@/lib/resources/validation';
import { readMetadata, writeMetadata, newLinkId } from '@/lib/resources/metadata';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { url?: string; label?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const url = String(body?.url ?? '');
  const label = String(body?.label ?? '');

  if (!validateUrl(url)) {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }
  if (!validateShortString(label)) {
    return NextResponse.json({ error: 'invalid label' }, { status: 400 });
  }

  try {
    const md = await readMetadata();
    const link = { id: newLinkId(), url, label, addedAt: Date.now() };
    md.links.push(link);
    await writeMetadata(md);
    return NextResponse.json(link);
  } catch (err) {
    console.error('[resources/links] POST failed:', err);
    return NextResponse.json({ error: 'add link failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { id?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const id = body?.id;
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }

  try {
    const md = await readMetadata();
    const before = md.links.length;
    md.links = md.links.filter((l) => l.id !== id);
    if (md.links.length === before) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    await writeMetadata(md);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[resources/links] DELETE failed:', err);
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }
}
