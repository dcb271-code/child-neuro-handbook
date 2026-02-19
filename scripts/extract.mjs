/**
 * extract.mjs — converts all .docx files to structured HTML + JSON
 * Handles OneNote exports that use font-size for heading hierarchy instead of
 * standard Word Heading styles.
 *
 * Run: node scripts/extract.mjs
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

fs.mkdirSync(DATA_DIR,   { recursive: true });
fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Font size (half-points) → heading tag
// OneNote exports: 40=20pt (page title), 32=16pt (H2), 28=14pt (H3), 24=12pt (H4)
function szToTag(sz) {
  if (!sz) return null;
  const n = parseInt(sz);
  if (n >= 40) return 'h1';
  if (n >= 32) return 'h2';
  if (n >= 28) return 'h3';
  if (n >= 24) return 'h4';
  return null;
}

/** Extract heading map from raw docx XML: text → heading tag */
function extractHeadingMap(docxPath) {
  const zip  = new AdmZip(docxPath);
  const xml  = zip.readAsText('word/document.xml');
  const paras = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  const map  = new Map(); // normalised text → tag

  for (const p of paras) {
    const text = (p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
      .map(t => t.replace(/<[^>]+>/g, ''))
      .join('')
      .trim();

    if (!text) continue;

    // Use the largest font size found anywhere in the paragraph
    const sizes = [...p.matchAll(/w:sz w:val="(\d+)"/g)].map(m => parseInt(m[1]));
    const maxSz = sizes.length ? Math.max(...sizes) : null;
    const tag   = szToTag(maxSz);

    // Skip OneNote date/time metadata (sz=20, looks like "Thursday, June 29, 2017")
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

const files = fs.readdirSync(DOCS_DIR)
  .filter(f => f.endsWith('.docx') && !f.startsWith('~'))
  .sort();

const index     = [];
const allChunks = [];

for (const file of files) {
  const name    = path.basename(file, '.docx');
  const slug    = slugify(name);
  const docPath = path.join(DOCS_DIR, file);

  console.log(`\nProcessing: ${name}`);

  // --- 1. Build heading map from raw XML ---
  const headingMap = extractHeadingMap(docPath);
  console.log(`  Heading candidates from XML: ${headingMap.size}`);

  // --- 2. Extract HTML + images with mammoth ---
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

  // --- 3. Post-process HTML: promote <p> to headings based on font-size map ---
  const $ = cheerio.load(result.value);

  // Replace <p> tags whose text matches a heading candidate.
  // Skip any <p> inside a table cell — those are table content, not section headings.
  $('p').each((_, el) => {
    if ($(el).closest('td, th').length) return;
    const text = $(el).text().trim();
    if (!text) return;
    const tag = headingMap.get(normalise(text));
    if (tag) {
      // Preserve inner HTML (might have <strong>, <em>)
      const inner = $(el).html() || '';
      $(el).replaceWith(`<${tag}>${inner}</${tag}>`);
    }
  });

  // Remove OneNote date/time metadata lines (grey small text at the top)
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s/.test(text)) {
      $(el).remove();
    }
    if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(text)) {
      $(el).remove();
    }
  });

  // Add IDs to all headings; build TOC
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

  // --- 4. Build search chunks (one per heading section) ---
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

  const sectionData = {
    name, slug,
    icon: meta.icon, color: meta.color,
    toc, html: finalHtml,
    imageCount: imgCounter,
    chunkCount: chunks.length,
  };

  fs.writeFileSync(path.join(DATA_DIR, `${slug}.json`), JSON.stringify(sectionData, null, 2));

  index.push({ name, slug, icon: meta.icon, color: meta.color, tocCount: toc.length, imageCount: imgCounter });
  for (const c of chunks) allChunks.push({ section: slug, sectionName: name, ...c });

  console.log(`  ✓ ${toc.length} headings, ${imgCounter} images, ${chunks.length} search chunks`);
}

fs.writeFileSync(path.join(DATA_DIR, 'index.json'),  JSON.stringify(index, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'search.json'), JSON.stringify(allChunks, null, 2));

// Also copy search.json to public/ so it's served as a static asset
const PUBLIC_DIR = path.join(ROOT, 'public');
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.copyFileSync(path.join(DATA_DIR, 'search.json'), path.join(PUBLIC_DIR, 'search.json'));

console.log(`\n✅ Done — ${index.length} sections, ${allChunks.length} total search chunks`);
