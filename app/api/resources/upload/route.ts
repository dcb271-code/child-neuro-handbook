import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { isAuthed } from '@/lib/resources/auth';
import {
  validateMime,
  validateSize,
  validateSubsection,
  validateShortString,
  type Subsection,
} from '@/lib/resources/validation';
import {
  blobPathFor,
  readMetadata,
  writeMetadata,
} from '@/lib/resources/metadata';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const subsection = String(form.get('subsection') ?? '');
  const titleRaw = form.get('title');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing file' }, { status: 400 });
  }
  if (!validateSubsection(subsection)) {
    return NextResponse.json({ error: 'invalid subsection' }, { status: 400 });
  }
  if (!validateMime(file.type)) {
    return NextResponse.json({ error: 'unsupported file type' }, { status: 400 });
  }
  if (!validateSize(file.size)) {
    return NextResponse.json({ error: 'file too large' }, { status: 400 });
  }

  const sub = subsection as Subsection;
  const pathname = blobPathFor(sub, file.name);

  // Upload first; only mutate metadata if upload succeeded.
  let url: string;
  try {
    const result = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type,
    });
    url = result.url;
  } catch (err) {
    console.error('[resources/upload] put() failed:', err);
    return NextResponse.json({ error: 'upload failed' }, { status: 500 });
  }

  let title: string | undefined;
  if (typeof titleRaw === 'string' && titleRaw.trim() !== '') {
    if (!validateShortString(titleRaw)) {
      return NextResponse.json({ error: 'invalid title' }, { status: 400 });
    }
    title = titleRaw;
    const md = await readMetadata();
    md.fileTitles[pathname] = title;
    await writeMetadata(md);
  }

  return NextResponse.json({ pathname, url, title });
}
