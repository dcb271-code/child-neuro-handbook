/**
 * Content-consistency invariants across the derived data files.
 *
 * These catch the drift that accumulates when a section's html/toc is edited
 * without regenerating derived data. If a test here fails after a content
 * edit, run: node scripts/build-search-index.mjs
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SECTION_WIDGET_IDS } from '../widgets';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

type TocEntry = { level: number; text: string; id: string };
type Section = {
  name: string;
  slug: string;
  toc: TocEntry[];
  html: string;
  tocCount: number;
  imageCount: number;
};
type IndexEntry = { name: string; slug: string; tocCount: number; imageCount: number };
type SearchEntry = { section: string; sectionName: string; heading: string; id: string; text: string };

const loadJson = (...p: string[]) =>
  JSON.parse(fs.readFileSync(path.join(...p), 'utf-8'));

const index: IndexEntry[] = loadJson(DATA_DIR, 'index.json');
const search: SearchEntry[] = loadJson(DATA_DIR, 'search.json');
const sections = new Map<string, Section>(
  index.map(e => [e.slug, loadJson(DATA_DIR, `${e.slug}.json`) as Section])
);

function headingIds(html: string): string[] {
  return [...html.matchAll(/<h[1-6]\b[^>]*\bid="([^"]*)"/g)].map(m => m[1]);
}

describe('section files', () => {
  for (const entry of index) {
    const section = sections.get(entry.slug)!;
    const ids = headingIds(section.html);
    const idSet = new Set(ids);
    const widgetIds = new Set(SECTION_WIDGET_IDS[entry.slug] ?? []);

    describe(entry.slug, () => {
      it('has unique, non-empty heading ids in html', () => {
        expect(ids.every(Boolean)).toBe(true);
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        expect(dupes).toEqual([]);
      });

      it('every toc id resolves to an html heading or a registered widget', () => {
        const dead = section.toc.filter(t => !idSet.has(t.id) && !widgetIds.has(t.id));
        expect(dead.map(t => `${t.id} (${t.text})`)).toEqual([]);
      });

      it('tocCount and imageCount match the actual content', () => {
        expect(section.tocCount).toBe(section.toc.length);
        expect(section.imageCount).toBe((section.html.match(/<img\b/g) ?? []).length);
      });

      it('index.json entry matches the section file', () => {
        expect(entry.name).toBe(section.name);
        expect(entry.tocCount).toBe(section.toc.length);
        expect(entry.imageCount).toBe(section.imageCount);
      });
    });
  }
});

describe('widget registry', () => {
  it('every widget section exists in index.json', () => {
    const slugs = new Set(index.map(e => e.slug));
    for (const slug of Object.keys(SECTION_WIDGET_IDS)) {
      expect(slugs.has(slug), `widget section "${slug}" missing from index.json`).toBe(true);
    }
  });

  it('every widget id appears in its section toc', () => {
    for (const [slug, ids] of Object.entries(SECTION_WIDGET_IDS)) {
      const tocIds = new Set(sections.get(slug)!.toc.map(t => t.id));
      for (const id of ids) {
        expect(tocIds.has(id), `widget "${id}" missing from ${slug} toc`).toBe(true);
      }
    }
  });
});

describe('search index', () => {
  it('src/data/search.json and public/search.json are identical', () => {
    const pub = loadJson(ROOT, 'public', 'search.json');
    expect(search).toEqual(pub);
  });

  it('every entry points at a real section', () => {
    const slugs = new Set(index.map(e => e.slug));
    const bad = search.filter(e => !slugs.has(e.section));
    expect(bad.map(e => `${e.section}:${e.id}`)).toEqual([]);
  });

  it('every entry anchor resolves (heading id, widget id, or section-intro)', () => {
    const bad = search.filter(e => {
      const section = sections.get(e.section);
      if (!section) return true;
      if (e.id === '') return e.heading !== section.name; // intro chunk links to section top
      return (
        !new Set(headingIds(section.html)).has(e.id) &&
        !(SECTION_WIDGET_IDS[e.section] ?? []).includes(e.id)
      );
    });
    expect(bad.map(e => `${e.section}:${e.id} (${e.heading})`)).toEqual([]);
  });

  it('every html heading is searchable', () => {
    const bySection = new Map<string, Set<string>>();
    for (const e of search) {
      if (!bySection.has(e.section)) bySection.set(e.section, new Set());
      bySection.get(e.section)!.add(e.id);
    }
    const missing: string[] = [];
    for (const entry of index) {
      const inSearch = bySection.get(entry.slug) ?? new Set();
      for (const id of headingIds(sections.get(entry.slug)!.html)) {
        if (!inSearch.has(id)) missing.push(`${entry.slug}:${id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('entries have non-empty headings and correct section names', () => {
    const names = new Map(index.map(e => [e.slug, e.name]));
    const bad = search.filter(
      e => !e.heading.trim() || e.sectionName !== names.get(e.section)
    );
    expect(bad.map(e => `${e.section}:${e.id}`)).toEqual([]);
  });
});
