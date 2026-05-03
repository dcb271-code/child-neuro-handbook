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

  const md = await readMetadata();
  if (md.fileTitles[pathname]) {
    delete md.fileTitles[pathname];
    await writeMetadata(md);
  }

  return NextResponse.json({ ok: true });
}
