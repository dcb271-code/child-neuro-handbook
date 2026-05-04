import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { isAuthed } from '@/lib/resources/auth';
import { readMetadata, writeMetadata } from '@/lib/resources/metadata';

export const runtime = 'nodejs';

export async function DELETE(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { pathname?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const pathname = body?.pathname;
  if (typeof pathname !== 'string' || !pathname.startsWith('resources/')) {
    return NextResponse.json({ error: 'invalid pathname' }, { status: 400 });
  }
  // Never let the client delete _metadata.json directly through this route
  if (pathname === 'resources/_metadata.json') {
    return NextResponse.json({ error: 'forbidden' }, { status: 400 });
  }

  try {
    await del(pathname);
  } catch (err) {
    console.error('[resources/file] del() failed:', err);
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }

  // Best-effort cleanup: blob is already gone, an orphaned title override is harmless.
  try {
    const md = await readMetadata();
    if (md.fileTitles[pathname]) {
      delete md.fileTitles[pathname];
      await writeMetadata(md);
    }
  } catch (err) {
    console.error('[resources/file] metadata cleanup failed:', err);
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { pathname?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const pathname = body?.pathname;
  const rawTitle = body?.title;

  if (typeof pathname !== 'string' || !pathname.startsWith('resources/')) {
    return NextResponse.json({ error: 'invalid pathname' }, { status: 400 });
  }
  if (pathname === 'resources/_metadata.json') {
    return NextResponse.json({ error: 'forbidden' }, { status: 400 });
  }
  if (typeof rawTitle !== 'string') {
    return NextResponse.json({ error: 'invalid title' }, { status: 400 });
  }

  const title = rawTitle.trim().slice(0, 200);

  try {
    const md = await readMetadata();
    if (title) {
      md.fileTitles[pathname] = title;
    } else {
      delete md.fileTitles[pathname];
    }
    await writeMetadata(md);
  } catch (err) {
    console.error('[resources/file] PATCH failed:', err);
    return NextResponse.json({ error: 'rename failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
