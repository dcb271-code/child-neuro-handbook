import { list } from '@vercel/blob';
import { readMetadata, resolveTitle } from '@/lib/resources/metadata';
import { isAuthed } from '@/lib/resources/auth';
import FileCard from '@/components/resources/FileCard';
import { fileIdFor } from '@/lib/resources/fileId';
import LinkCard from '@/components/resources/LinkCard';
import AuthBar from '@/components/resources/AuthBar';
import UploadDropzone from '@/components/resources/UploadDropzone';
import AddLinkModal from '@/components/resources/AddLinkModal';
import DeleteHandlers from '@/components/resources/DeleteHandlers';
import CollapsibleSection from '@/components/resources/CollapsibleSection';
import type { Subsection } from '@/lib/resources/validation';

export const dynamic = 'force-dynamic';

type FileRow = { pathname: string; url: string; title: string; contentType: string; uploadedAt: number };

function contentTypeFromPathname(pathname: string): string {
  const ext = pathname.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'application/pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  if (['ppt', 'pptx'].includes(ext)) return 'application/vnd.ms-powerpoint';
  if (['doc', 'docx'].includes(ext)) return 'application/msword';
  return 'application/octet-stream';
}

async function listSubsection(sub: Subsection, fileTitles: Record<string, string>): Promise<FileRow[]> {
  const { blobs } = await list({ prefix: `resources/${sub}/` });
  return blobs
    .map((b) => ({
      pathname: b.pathname,
      url: b.url,
      title: resolveTitle(b.pathname, { links: [], fileTitles }),
      contentType: contentTypeFromPathname(b.pathname),
      uploadedAt: b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0,
    }))
    .sort((a, b) => b.uploadedAt - a.uploadedAt);
}

const SUBSECTIONS: Array<{
  key: Subsection | 'links';
  title: string;
  blurb: string;
  color: string;
}> = [
  { key: 'misc',        title: 'Library',                    blurb: 'Reference papers and saved files', color: '#d97706' },
  { key: 'journal',     title: 'Journal Club',               blurb: 'Articles for journal club',         color: '#0d9488' },
  { key: 'conferences', title: 'Conferences',                blurb: 'Slide decks and handouts',          color: '#7c3aed' },
  { key: 'lectures',    title: 'Lectures / Teaching Files',  blurb: 'Teaching slides and handouts',      color: '#059669' },
  { key: 'general',     title: 'Misc',                       blurb: 'Everything else',                   color: '#475569' },
  { key: 'links',       title: 'External Links',             blurb: 'Curated outside resources',         color: '#2563eb' },
];

export default async function ResourcesPage() {
  const authed = (() => { try { return isAuthed(); } catch { return false; } })();
  const md = await readMetadata();

  const [conferences, lectures, misc, general, journal] = await Promise.all([
    listSubsection('conferences', md.fileTitles),
    listSubsection('lectures', md.fileTitles),
    listSubsection('misc', md.fileTitles),
    listSubsection('general', md.fileTitles),
    listSubsection('journal', md.fileTitles),
  ]);

  const filesBySub: Record<'conferences' | 'lectures' | 'misc' | 'general' | 'journal', FileRow[]> = {
    conferences, lectures, misc, general, journal,
  };

  return (
    <div>
      {authed && <DeleteHandlers />}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
          Resources & Conferences
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Lectures, slides, external links, and other shared files.
        </p>
      </div>

      <AuthBar authed={authed} />

      {SUBSECTIONS.map((s) => {
        const count = s.key === 'links' ? md.links.length : filesBySub[s.key].length;
        const fileIds = s.key === 'links' ? [] : filesBySub[s.key].map((f) => fileIdFor(f.pathname));
        return (
          <CollapsibleSection
            key={s.key}
            title={s.title}
            blurb={s.blurb}
            color={s.color}
            count={count}
            fileIds={fileIds}
          >
            {s.key === 'links' ? (
              <>
                <div className="pathway-grid">
                  {md.links.length === 0 && <p className="text-sm text-slate-400">No links yet.</p>}
                  {md.links.map((l) => (
                    <LinkCard key={l.id} id={l.id} url={l.url} label={l.label} authed={authed} />
                  ))}
                </div>
                {authed && <div className="mt-3"><AddLinkModal /></div>}
              </>
            ) : (
              <>
                <div className="pathway-grid">
                  {filesBySub[s.key].length === 0 && <p className="text-sm text-slate-400">No files yet.</p>}
                  {filesBySub[s.key].map((f) => (
                    <FileCard
                      key={f.pathname}
                      pathname={f.pathname}
                      url={f.url}
                      title={f.title}
                      contentType={f.contentType}
                      authed={authed}
                    />
                  ))}
                </div>
                {authed && <UploadDropzone subsection={s.key as 'conferences' | 'lectures' | 'misc' | 'general' | 'journal'} />}
              </>
            )}
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
