/**
 * re-extract-sections.mjs — targeted re-extraction of specific sections
 * Clones extract.mjs logic but only processes named sections.
 * Updates individual JSON files, index.json, search.json, and public/search.json.
 *
 * Usage: node scripts/re-extract-sections.mjs headaches paroxysms stroke ...
 */

import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, '..');
const DOCS_DIR   = 'C:/Users/dylan/Child Neuro Handbook Word';
const DATA_DIR   = path.join(ROOT, 'src', 'data');
const IMAGES_DIR = path.join(ROOT, 'public', 'images');

// ── Helpers (same as extract.mjs) ────────────────────────────────────────────

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
  const zip  = new AdmZip(docxPath);
  const xml  = zip.readAsText('word/document.xml');
  const paras = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  const map  = new Map();

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

    if (tag) {
      map.set(normalise(text), tag);
    }
  }
  return map;
}

function normalise(t) {
  return t.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 120);
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function headingId(text, counters) {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  counters[base] = (counters[base] ?? 0) + 1;
  return counters[base] === 1 ? base : `${base}-${counters[base]}`;
}

const SECTION_META = {
  'epilepsy':                          { icon: '⚡', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  'development':                       { icon: '🧠', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'headaches':                         { icon: '🤕', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  'infectious-disease':                { icon: '🦠', color: 'bg-red-100 text-red-800 border-red-200' },
  'movement-disorders':                { icon: '🔄', color: 'bg-green-100 text-green-800 border-green-200' },
  'neuro-exam':                        { icon: '🩺', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  'neurocritical-care':                { icon: '🏥', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  'neurogenetics-and-neurometabolics': { icon: '🧬', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  'neuro-ophthalmology':               { icon: '👁️', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  'neuroradiology':                    { icon: '🔬', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  'other-topics':                      { icon: '📋', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  'paroxysms':                         { icon: '💥', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'pediatric-normal-values':           { icon: '📊', color: 'bg-lime-100 text-lime-800 border-lime-200' },
  'psychiatry':                        { icon: '💭', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  'sleep':                             { icon: '😴', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  'stroke':                            { icon: '🫀', color: 'bg-amber-100 text-amber-800 border-amber-200' },
};

// ── Parse CLI args ───────────────────────────────────────────────────────────

const requestedSlugs = process.argv.slice(2);
if (requestedSlugs.length === 0) {
  console.error('Usage: node scripts/re-extract-sections.mjs <slug1> <slug2> ...');
  console.error('Example: node scripts/re-extract-sections.mjs headaches paroxysms stroke');
  process.exit(1);
}

// Build slug → docx filename mapping from DOCS_DIR listing
const allDocx = fs.readdirSync(DOCS_DIR)
  .filter(f => f.endsWith('.docx') && !f.startsWith('~'));

const slugToDocx = new Map();
for (const file of allDocx) {
  const name = path.basename(file, '.docx');
  slugToDocx.set(slugify(name), { file, name });
}

// Validate requested slugs
for (const slug of requestedSlugs) {
  if (!slugToDocx.has(slug)) {
    console.error(`Error: No docx found for slug "${slug}"`);
    console.error(`Available slugs: ${[...slugToDocx.keys()].sort().join(', ')}`);
    process.exit(1);
  }
}

console.log(`\nRe-extracting ${requestedSlugs.length} sections: ${requestedSlugs.join(', ')}\n`);

// ── Process each requested section ───────────────────────────────────────────

const results = []; // { name, slug, icon, color, tocCount, imageCount, chunkCount, chunks }

for (const slug of requestedSlugs) {
  const { file, name } = slugToDocx.get(slug);
  const docPath = path.join(DOCS_DIR, file);

  console.log(`Processing: ${name} (${slug})`);

  // 1. Build heading map from raw XML
  const headingMap = extractHeadingMap(docPath);
  console.log(`  Heading candidates from XML: ${headingMap.size}`);

  // 2. Extract HTML + images with mammoth
  const imgDir = path.join(IMAGES_DIR, slug);
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
        return { src: `/images/${slug}/${fname}`, alt: '' };
      }),
    }
  );

  // 3. Post-process HTML
  const $ = cheerio.load(result.value);

  // Promote <p> to headings based on font-size map (skip table cells)
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

  // Remove OneNote date/time metadata lines
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s/.test(text)) {
      $(el).remove();
    }
    if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(text)) {
      $(el).remove();
    }
  });

  // Add IDs to headings; build TOC
  const idCounters = {};
  const toc = [];

  $('h1, h2, h3, h4').each((_, el) => {
    const text = $(el).text().trim();
    if (!text) return;
    const id = headingId(text, idCounters);
    $(el).attr('id', id);
    toc.push({ level: parseInt(el.tagName[1]), text, id });
  });

  // Style fixes
  $('img').addClass('max-w-full rounded-lg my-4 mx-auto block');
  $('table').each((_, el) => {
    const outer = $.html(el);
    $(el).replaceWith(`<div class="table-wrap">${outer}</div>`);
  });

  const finalHtml = $('body').html() || '';

  // 4. Build search chunks
  const chunks = [];
  let curHeading = name;
  let curId      = '';
  let curText    = '';

  $('body').children().each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    if (['h1','h2','h3','h4'].includes(tag)) {
      if (curText.trim()) {
        chunks.push({ heading: curHeading, id: curId, text: curText.trim().slice(0, 600) });
      }
      curHeading = $(el).text().trim();
      curId      = $(el).attr('id') || '';
      curText    = '';
    } else {
      curText += ' ' + $(el).text();
    }
  });
  if (curText.trim()) {
    chunks.push({ heading: curHeading, id: curId, text: curText.trim().slice(0, 600) });
  }

  const meta = SECTION_META[slug] ?? { icon: '📄', color: 'bg-gray-100 text-gray-800 border-gray-200' };

  // 5. Write section JSON
  const sectionData = {
    name, slug,
    icon: meta.icon, color: meta.color,
    toc, html: finalHtml,
    imageCount: imgCounter,
    chunkCount: chunks.length,
  };

  fs.writeFileSync(path.join(DATA_DIR, `${slug}.json`), JSON.stringify(sectionData, null, 2));

  results.push({
    name, slug,
    icon: meta.icon, color: meta.color,
    tocCount: toc.length, imageCount: imgCounter,
    chunkCount: chunks.length,
    chunks,
  });

  console.log(`  ✓ ${toc.length} headings, ${imgCounter} images, ${chunks.length} search chunks`);
}

// ── Update index.json (in-place replacement, preserving order) ───────────────

const indexPath = path.join(DATA_DIR, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

for (const r of results) {
  const existing = index.findIndex(e => e.slug === r.slug);
  const entry = {
    name: r.name, slug: r.slug,
    icon: r.icon, color: r.color,
    tocCount: r.tocCount, imageCount: r.imageCount,
  };
  if (existing >= 0) {
    index[existing] = entry;
  } else {
    index.push(entry);
  }
}

fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log(`\n✓ Updated index.json`);

// ── Update search.json (filter out old entries for these slugs, add new) ─────

const searchPath  = path.join(DATA_DIR, 'search.json');
const publicSearchPath = path.join(ROOT, 'public', 'search.json');

let allChunks = [];
if (fs.existsSync(searchPath)) {
  allChunks = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));
}

// Remove old entries for re-extracted sections
const reExtractedSlugs = new Set(requestedSlugs);
allChunks = allChunks.filter(c => !reExtractedSlugs.has(c.section));

// Add new entries
for (const r of results) {
  for (const c of r.chunks) {
    allChunks.push({ section: r.slug, sectionName: r.name, ...c });
  }
}

fs.writeFileSync(searchPath, JSON.stringify(allChunks, null, 2));
fs.mkdirSync(path.dirname(publicSearchPath), { recursive: true });
fs.copyFileSync(searchPath, publicSearchPath);
console.log(`✓ Updated search.json and public/search.json`);

console.log(`\n✅ Done — re-extracted ${results.length} sections`);
for (const r of results) {
  console.log(`  ${r.slug}: ${r.tocCount} headings, ${r.imageCount} images, ${r.chunkCount} chunks`);
}
