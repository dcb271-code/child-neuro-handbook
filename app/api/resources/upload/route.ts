// Issues short-lived client tokens so the browser uploads *directly* to Blob
// storage.
//
// This used to accept the file as multipart form data and forward it with
// put(). That fails in a way that looks like a network error to the user: the
// route cannot resolve req.formData() until the whole body has arrived, so the
// upload time counts against the function's execution budget, and a file on a
// slow connection gets the function killed mid-transfer. Vercel also caps
// serverless request bodies at 4.5 MB, which is why MAX_FILE_BYTES used to sit
// just under it at 4 MB.
//
// With a direct upload the bytes never touch this function — it only validates
// the session and mints a token — so neither limit applies and the size cap is
// a product decision rather than a platform one.
//
// The client sets the file's title afterwards via PATCH /api/resources/file.
// onUploadCompleted is deliberately not used for that: it arrives as a webhook
// from Vercel's servers, so it never fires against localhost and carries no
// session cookie.

import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { isAuthed } from '@/lib/resources/auth';
import { ALLOWED_MIME, MAX_FILE_BYTES } from '@/lib/resources/validation';
import { isUploadablePath } from '@/lib/resources/paths';
import { METADATA_PATH } from '@/lib/resources/metadata';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // The browser chooses the pathname now, so this is the security
        // boundary: keep writes inside resources/<subsection>/ and never let
        // one land on the metadata blob.
        if (!isUploadablePath(pathname) || pathname === METADATA_PATH) {
          throw new Error('invalid pathname');
        }
        return {
          allowedContentTypes: [...ALLOWED_MIME],
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: false,
          // blobPathFor timestamps every key, so a collision means a repeat
          // upload of the same name in the same millisecond. Refuse it.
          allowOverwrite: false,
        };
      },
      onUploadCompleted: async () => {
        // Nothing to do: the client PATCHes the title once upload() resolves.
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error('[resources/upload] handleUpload failed:', err);
    const message = err instanceof Error ? err.message : 'upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
