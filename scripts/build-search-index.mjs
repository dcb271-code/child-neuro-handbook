/**
 * build-search-index.mjs
 * Rebuilds all derived content data from the section JSON files:
 *
 *  1. search.json (src/data + public copies) — one entry per HTML heading
 *     (h1–h6 with an id), plus widget toc entries (calculators rendered at
 *     runtime) and a section-intro entry when meaningful text precedes the
 *     first heading (id: '' → links to the top of the section).
 *  2. Each section file's `tocCount` (= toc.length) and `imageCount`
 *     (= number of <img> tags in the html).
 *  3. index.json `tocCount` / `imageCount` per section.
 *
 * Idempotent — safe to run any time a section's html or toc changes.
 * The invariants this enforces are tested in lib/content/__tests__/consistency.test.ts.
 *
 * Run: node scripts/build-search-index.mjs
 */

import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

// Must mirror lib/content/widgets.ts (plain .mjs script can't import the TS module).
const SECTION_WIDGET_IDS = {
  epilepsy: ['asm-withdrawal-calculator', 'seizure-risk-calculators', 'sudep-risk-calculator'],
  'neurocritical-care': ['hie-calculator', 'se-med-ladder'],
};

const TEXT_LIMIT = 600;        // max chars of body text stored per entry
const INTRO_MIN_CHARS = 40;    // minimum pre-first-heading text to warrant an intro entry

const HEADING_RE = /<h([1-6])\b[^>]*>/g;

function htmlToText(html) {
  return cheerio.load(html).root().text().replace(/\s+/g, ' ').trim();
}

/** All headings in document order with their position/level/id, from the raw html string. */
function findHeadings(html) {
  const out = [];
  let m;
  HEADING_RE.lastIndex = 0;
  while ((m = HEADING_RE.exec(html)) !== null) {
    const level = Number(m[1]);
    const close = html.indexOf(`</h${level}>`, m.index);
    const idMatch = /id="([^"]*)"/.exec(m[0]);
    out.push({
      start: m.index,
      contentEnd: close === -1 ? m.index + m[0].length : close + `</h${level}>`.length,
      level,
      id: idMatch ? idMatch[1] : '',
      text: htmlToText(html.slice(m.index + m[0].length, close === -1 ? m.index + m[0].length : close)),
    });
  }
  return out;
}

/**
 * Body text for the heading at index i: everything up to the next heading of
 * any level; if that is empty (heading immediately followed by a subheading),
 * fall back to everything up to the next heading of the same or higher level,
 * so parent headings are still searchable by their content.
 */
function bodyText(html, headings, i) {
  const h = headings[i];
  const nextAny = headings[i + 1];
  const direct = htmlToText(html.slice(h.contentEnd, nextAny ? nextAny.start : html.length));
  if (direct) return direct.slice(0, TEXT_LIMIT);
  const nextPeer = headings.slice(i + 1).find(x => x.level <= h.level);
  const deep = htmlToText(html.slice(h.contentEnd, nextPeer ? nextPeer.start : html.length));
  return deep.slice(0, TEXT_LIMIT);
}

const index = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'index.json'), 'utf-8'));
const searchEntries = [];
const problems = [];

for (const entry of index) {
  const file = path.join(DATA_DIR, `${entry.slug}.json`);
  const section = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const { html, toc } = section;
  const headings = findHeadings(html);
  const headingIds = new Set(headings.map(h => h.id).filter(Boolean));
  const widgetIds = new Set(SECTION_WIDGET_IDS[entry.slug] ?? []);

  // Section intro — text before the first heading.
  const introText = htmlToText(html.slice(0, headings.length ? headings[0].start : html.length));
  if (introText.length >= INTRO_MIN_CHARS) {
    searchEntries.push({
      section: entry.slug,
      sectionName: entry.name,
      heading: entry.name,
      id: '',
      text: introText.slice(0, TEXT_LIMIT),
    });
  }

  headings.forEach((h, i) => {
    if (!h.id) {
      problems.push(`${entry.slug}: heading "${h.text}" has no id — not searchable/linkable`);
      return;
    }
    searchEntries.push({
      section: entry.slug,
      sectionName: entry.name,
      heading: h.text,
      id: h.id,
      text: bodyText(html, headings, i),
    });
  });

  // Widget toc entries (no heading in the stored html — rendered at runtime).
  for (const t of toc) {
    if (headingIds.has(t.id)) continue;
    if (widgetIds.has(t.id)) {
      searchEntries.push({
        section: entry.slug,
        sectionName: entry.name,
        heading: t.text,
        id: t.id,
        text: '',
      });
    } else {
      problems.push(`${entry.slug}: toc id "${t.id}" (${t.text}) matches no heading and no widget`);
    }
  }

  // Sync per-file counts with a surgical edit, so we preserve each file's existing
  // formatting. (build-call-schedule.mjs rewrites neuro-on-call.json pretty-printed;
  // a full re-serialize here would fight it and produce whole-file diffs.)
  const imageCount = (html.match(/<img\b/g) ?? []).length;
  if (section.tocCount !== toc.length || section.imageCount !== imageCount) {
    let raw = fs.readFileSync(file, 'utf-8');
    for (const [field, value] of [['tocCount', toc.length], ['imageCount', imageCount]]) {
      const re = new RegExp(`("${field}"\\s*:\\s*)\\d+`);
      raw = re.test(raw)
        ? raw.replace(re, `$1${value}`)
        // Field absent — append it before the closing brace, matching the file's style.
        : raw.replace(/\}\s*$/, m => `,"${field}":${value}${m}`);
    }
    fs.writeFileSync(file, raw);
  }

  // Sync index.json counts.
  entry.tocCount = toc.length;
  entry.imageCount = imageCount;

  console.log(`${entry.slug}: ${headings.length} headings, ${toc.length} toc, ${imageCount} images`);
}

if (problems.length) {
  console.error('\nProblems found — fix these before trusting the index:');
  for (const p of problems) console.error('  ✗ ' + p);
  process.exit(1);
}

fs.writeFileSync(path.join(DATA_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n');
const searchJson = JSON.stringify(searchEntries) + '\n';
fs.writeFileSync(path.join(DATA_DIR, 'search.json'), searchJson);
fs.writeFileSync(path.join(ROOT, 'public', 'search.json'), searchJson);

console.log(`\nWrote ${searchEntries.length} search entries (src/data/search.json + public/search.json), updated index.json counts.`);
