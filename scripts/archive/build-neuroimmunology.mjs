/**
 * build-neuroimmunology.mjs
 * Extracts Neuroimmunology.docx → src/data/neuroimmunology.json
 * Then inserts the entry into index.json (alphabetically) and updates search.json.
 *
 * Uses the same heading-detection logic as extract.mjs (font-size based, for OneNote exports).
 * Run: node scripts/build-neuroimmunology.mjs
 */

import mammoth  from 'mammoth';
import * as cheerio from 'cheerio';
import AdmZip   from 'adm-zip';
import fs       from 'fs';
import path     from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, '..');
const DOCS_DIR   = 'C:/Users/dylan/Child Neuro Handbook Word';
const DATA_DIR   = path.join(ROOT, 'src', 'data');
const IMAGES_DIR = path.join(ROOT, 'public', 'images');
const PUBLIC_DIR = path.join(ROOT, 'public');

const SLUG = 'neuroimmunology';
const NAME = 'Neuroimmunology';
const META = { icon: '🛡️', color: 'bg-sky-100 text-sky-800 border-sky-200' };

// ── Heading detection (same as extract.mjs) ────────────────────────────────
function szToTag(sz) {
  if (!sz) return null;
  const n = parseInt(sz);
  if (n >= 40) return 'h1';
  if (n >= 32) return 'h2';
  if (n >= 28) return 'h3';
  if (n >= 24) return 'h4';
  return null;
}

function extractHeadingMap(docxPath) {
  const zip   = new AdmZip(docxPath);
  const xml   = zip.readAsText('word/document.xml');
  const paras = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  const map   = new Map();

  for (const p of paras) {
    const text = (p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
      .map(t => t.replace(/<[^>]+>/g, ''))
      .join('')
      .trim();

    if (!text) continue;

    const sizes = [...p.matchAll(/w:sz w:val="(\d+)"/g)].map(m => parseInt(m[1]));
    const maxSz = sizes.length ? Math.max(...sizes) : null;
    const tag   = szToTag(maxSz);

    if (maxSz && maxSz <= 20 && /\d{4}/.test(text)) continue;
    if (tag) map.set(normalise(text), tag);
  }
  return map;
}

function normalise(t) {
  return t.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 120);
}

function headingId(text, counters) {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  counters[base] = (counters[base] ?? 0) + 1;
  return counters[base] === 1 ? base : `${base}-${counters[base]}`;
}

// ── Extract ─────────────────────────────────────────────────────────────────
const docPath = path.join(DOCS_DIR, 'Neuroimmunology.docx');
console.log('Processing: Neuroimmunology');

const headingMap = extractHeadingMap(docPath);
console.log(`  Heading candidates from XML: ${headingMap.size}`);

const imgDir = path.join(IMAGES_DIR, SLUG);
fs.mkdirSync(imgDir, { recursive: true });
let imgCounter = 0;

const result = await mammoth.convertToHtml(
  { path: docPath },
  {
    convertImage: mammoth.images.imgElement(async (image) => {
      const ext   = (image.contentType || 'image/png').split('/')[1].replace('jpeg', 'jpg');
      const fname = `img-${++imgCounter}.${ext}`;
      const buf   = await image.read('base64');
      fs.writeFileSync(path.join(imgDir, fname), Buffer.from(buf, 'base64'));
      return { src: `/images/${SLUG}/${fname}`, alt: '' };
    }),
  }
);

// ── Post-process HTML ───────────────────────────────────────────────────────
const $ = cheerio.load(result.value);

$('p').each((_, el) => {
  if ($(el).closest('td, th').length) return;
  const text = $(el).text().trim();
  if (!text) return;
  const tag = headingMap.get(normalise(text));
  if (tag) {
    const inner = $(el).html() || '';
    $(el).replaceWith(`<${tag}>${inner}</${tag}>`);
  }
});

// Remove OneNote date/time metadata
$('p').each((_, el) => {
  const text = $(el).text().trim();
  if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s/.test(text)) $(el).remove();
  if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(text)) $(el).remove();
});

// Add IDs and build TOC
const idCounters = {};
const toc = [];

$('h1, h2, h3, h4').each((_, el) => {
  const text = $(el).text().trim();
  if (!text) return;
  const id = headingId(text, idCounters);
  $(el).attr('id', id);
  toc.push({ level: parseInt(el.tagName[1]), text, id });
});

$('img').addClass('max-w-full rounded-lg my-4 mx-auto block');
$('table').each((_, el) => {
  const outer = $.html(el);
  $(el).replaceWith(`<div class="table-wrap">${outer}</div>`);
});

const finalHtml = $('body').html() || '';

// ── Search chunks ───────────────────────────────────────────────────────────
const chunks = [];
let curHeading = NAME;
let curId      = '';
let curText    = '';

$('body').children().each((_, el) => {
  const tag = el.tagName?.toLowerCase();
  if (['h1','h2','h3','h4'].includes(tag)) {
    if (curText.trim()) chunks.push({ heading: curHeading, id: curId, text: curText.trim().slice(0, 600) });
    curHeading = $(el).text().trim();
    curId      = $(el).attr('id') || '';
    curText    = '';
  } else {
    curText += ' ' + $(el).text();
  }
});
if (curText.trim()) chunks.push({ heading: curHeading, id: curId, text: curText.trim().slice(0, 600) });

// ── Write section JSON ──────────────────────────────────────────────────────
fs.mkdirSync(DATA_DIR, { recursive: true });

const sectionData = {
  name: NAME, slug: SLUG,
  icon: META.icon, color: META.color,
  toc, html: finalHtml,
  imageCount: imgCounter,
  chunkCount: chunks.length,
};

fs.writeFileSync(path.join(DATA_DIR, `${SLUG}.json`), JSON.stringify(sectionData, null, 2));
console.log(`  ✓ ${toc.length} headings, ${imgCounter} images, ${chunks.length} search chunks`);

// ── Update index.json (insert alphabetically by name) ──────────────────────
const indexPath = path.join(DATA_DIR, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
const filtered = index.filter(s => s.slug !== SLUG);
const newEntry = { name: NAME, slug: SLUG, icon: META.icon, color: META.color, tocCount: toc.length, imageCount: imgCounter };

const insertIdx = filtered.findIndex(s => s.name > NAME);
if (insertIdx === -1) filtered.push(newEntry);
else filtered.splice(insertIdx, 0, newEntry);

fs.writeFileSync(indexPath, JSON.stringify(filtered, null, 2));

// ── Update search.json ──────────────────────────────────────────────────────
const searchPath = path.join(DATA_DIR, 'search.json');
const allChunks  = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));
const filteredChunks = allChunks.filter(c => c.section !== SLUG);
for (const c of chunks) filteredChunks.push({ section: SLUG, sectionName: NAME, ...c });

fs.writeFileSync(searchPath, JSON.stringify(filteredChunks, null, 2));
fs.copyFileSync(searchPath, path.join(PUBLIC_DIR, 'search.json'));

console.log(`\n✅ Neuroimmunology done — inserted at index position ${insertIdx === -1 ? filtered.length - 1 : insertIdx}`);
