import { list } from '@vercel/blob';
import { readMetadata, resolveTitle } from '@/lib/resources/metadata';
import { isAuthed } from '@/lib/resources/auth';
import FileCard from '@/components/resources/FileCard';
import LinkCard from '@/components/resources/LinkCard';
import AuthBar from '@/components/resources/AuthBar';
import UploadDropzone from '@/components/resources/UploadDropzone';
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
  icon: string;
}> = [
  { key: 'conferences', title: 'Conferences',                 blurb: 'Slide decks and handouts',     color: '#7c3aed', icon: '🎓' },
  { key: 'lectures',    title: 'Lectures / Teaching Files',   blurb: 'Teaching slides and handouts', color: '#059669', icon: '📚' },
  { key: 'links',       title: 'External Links',              blurb: 'Curated outside resources',    color: '#2563eb', icon: '🔗' },
  { key: 'misc',        title: 'Misc Files',                  blurb: 'Everything else',              color: '#475569', icon: '📁' },
];

export default async function ResourcesPage() {
  const authed = (() => { try { return isAuthed(); } catch { return false; } })();
  const md = await readMetadata();

  const [conferences, lectures, misc] = await Promise.all([
    listSubsection('conferences', md.fileTitles),
    listSubsection('lectures', md.fileTitles),
    listSubsection('misc', md.fileTitles),
  ]);

  const filesBySub: Record<'conferences' | 'lectures' | 'misc', FileRow[]> = {
    conferences, lectures, misc,
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
          Resources & Conferences
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Lectures, slides, external links, and other shared files.
        </p>
      </div>

      <AuthBar authed={authed} />

      {SUBSECTIONS.map((s) => (
        <section key={s.key} className="mb-10">
          <h2
            className="flex items-center gap-2 text-base sm:text-lg font-semibold mb-3 px-3 py-2 rounded-md"
            style={{ backgroundColor: `${s.color}15`, color: s.color }}
          >
            <span>{s.icon}</span>
            <span>{s.title}</span>
            <span className="text-xs font-normal text-slate-500 ml-2">{s.blurb}</span>
          </h2>

          {s.key === 'links' ? (
            <div className="pathway-grid">
              {md.links.length === 0 && <p className="text-sm text-slate-400">No links yet.</p>}
              {md.links.map((l) => (
                <LinkCard key={l.id} id={l.id} url={l.url} label={l.label} authed={authed} />
              ))}
            </div>
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
              {authed && <UploadDropzone subsection={s.key as 'conferences' | 'lectures' | 'misc'} />}
            </>
          )}
        </section>
      ))}
    </div>
  );
}
