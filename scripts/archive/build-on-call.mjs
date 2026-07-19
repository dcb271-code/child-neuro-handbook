/**
 * build-on-call.mjs
 * Builds the "Neuro On-Call Quick References" section from the On Call folder.
 *
 * File handling strategy:
 *   .docx  → extract text with mammoth, demote headings to h3/h4
 *   image  → copy to public/images/neuro-on-call/, embed as <img>
 *   .pdf   → copy to public/pdfs/neuro-on-call/, embed with <object> + download link
 *   .xlsx  → parse with xlsx package → render as scrollable HTML table
 *   .heic  → skipped (no browser support)
 *
 * Subsections (each becomes an h2 / pill in mobile nav):
 *   1. Seizure & Status Epilepticus
 *   2. Seizure Medications & Dosing
 *   3. Stroke
 *   4. Headache & Migraine
 *   5. Clinical Reference Images
 *
 * Run: node scripts/build-on-call.mjs
 */

import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import AdmZip from 'adm-zip';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, '..');
const ON_CALL    = 'C:/Users/dylan/Child Neuro Handbook Word/On Call';
const DATA_DIR   = path.join(ROOT, 'src', 'data');
const IMG_DIR    = path.join(ROOT, 'public', 'images', 'neuro-on-call');
const PDF_DIR    = path.join(ROOT, 'public', 'pdfs',   'neuro-on-call');
const PUBLIC_DIR = path.join(ROOT, 'public');

const SLUG = 'neuro-on-call';
const NAME = 'Neuro On-Call Quick References';
const META = { icon: '🚨', color: 'bg-rose-100 text-rose-800 border-rose-200' };

fs.mkdirSync(IMG_DIR,  { recursive: true });
fs.mkdirSync(PDF_DIR,  { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Subsection definitions ───────────────────────────────────────────────────
// Each subsection has an id (becomes the h2 anchor), a display title,
// accent colors for the header card, and an ordered list of files to include.
const SUBSECTIONS = [
  {
    id:     'status-epilepticus',
    title:  'Seizure & Status Epilepticus',
    desc:   'Acute management pathways, visual protocols, and pocket reference cards',
    accent: '#dc2626',
    bg:     '#fef2f2',
    border: '#fca5a5',
    icon:   '⚡',
    files: [
      { name: 'Status Pathway.jpeg',            type: 'image', label: 'Status Epilepticus Pathway' },
      { name: 'Neonatal Seizures.png',           type: 'image', label: 'Neonatal Seizures Reference' },
      { name: 'YES_PocketCard_Epi_med-v3.pdf',  type: 'pdf',   label: 'YES Epilepsy Pocket Card' },
      { name: '913888_1.pdf',                   type: 'pdf',   label: 'Seizure Protocol Reference' },
    ],
  },
  {
    id:     'seizure-medications',
    title:  'Seizure Medications & Dosing',
    desc:   'Anti-seizure medication reference table, benzodiazepine dosing, and weight-based guides',
    accent: '#7c3aed',
    bg:     '#f5f3ff',
    border: '#c4b5fd',
    icon:   '💊',
    files: [
      { name: 'Diastat Dosing.docx',            type: 'docx',  label: 'Diastat / Diazepam Rectal Dosing' },
      { name: 'ASM Table.xlsx',                  type: 'xlsx',  label: 'Anti-Seizure Medications Table' },
      {
        name:  'The-height-of-man-rule-schematic-diagram-with-regard-to-dosing-of-children-with.png',
        type:  'image',
        label: 'Weight-Based Dosing Schematic',
      },
    ],
  },
  {
    id:     'stroke',
    title:  'Stroke',
    desc:   'NIHSS scoring guide, pediatric stroke management, and AHA/ASA guidelines',
    accent: '#b45309',
    bg:     '#fffbeb',
    border: '#fcd34d',
    icon:   '🧠',
    files: [
      { name: 'Ped NIHSS pictures.docx',        type: 'docx',  label: 'Pediatric NIHSS Visual Guide' },
      {
        name:  'Management-of-stroke-in-neonates-and-children-a-scientific-statement-from-the-american-heart.pdf',
        type:  'pdf',
        label: 'AHA/ASA: Management of Stroke in Neonates & Children',
      },
    ],
  },
  {
    id:     'headache-migraine',
    title:  'Headache & Migraine',
    desc:   'Inpatient migraine management pathway and treatment protocols',
    accent: '#0d9488',
    bg:     '#f0fdfa',
    border: '#99f6e4',
    icon:   '🤕',
    files: [
      { name: 'Migraine Inpatient Pathway 2020 (1).docx', type: 'docx', label: 'Migraine Inpatient Pathway (2020)' },
    ],
  },
  {
    id:     'clinical-reference-images',
    title:  'Clinical Reference Images',
    desc:   'Additional visual reference materials for on-call scenarios',
    accent: '#475569',
    bg:     '#f8fafc',
    border: '#cbd5e1',
    icon:   '🖼️',
    files: [
      { name: 'IMG_7641.jpeg',     type: 'image' },
      { name: 'IMG_7642 (1).png',  type: 'image' },
      { name: 'IMG_7643.jpeg',     type: 'image' },
      { name: 'IMG_7644.jpeg',     type: 'image' },
      { name: 'IMG_7645.jpeg',     type: 'image' },
      { name: 'Image.png',         type: 'image' },
      { name: 'Image (1).png',     type: 'image' },
      { name: 'Image (2).png',     type: 'image' },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalise(t) {
  return t.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 120);
}

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

/** Extract docx → HTML, demoting all headings to h3/h4 so they don't
 *  conflict with our subsection h2 elements. */
async function extractDocx(filePath) {
  const headingMap = extractHeadingMap(filePath);

  const result = await mammoth.convertToHtml(
    { path: filePath },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const ext   = (image.contentType || 'image/png').split('/')[1].replace('jpeg', 'jpg');
        const fname = `docx-img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const buf   = await image.read('base64');
        fs.writeFileSync(path.join(IMG_DIR, fname), Buffer.from(buf, 'base64'));
        return { src: `/images/${SLUG}/${fname}`, alt: '' };
      }),
    }
  );

  const $ = cheerio.load(result.value);

  // Promote font-size-based headings
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

  // Remove date/time metadata
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s/.test(text)) $(el).remove();
    if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(text)) $(el).remove();
  });

  // Demote h1/h2 → h3; h3/h4 stay as h4
  // Do h1→h3 first, then h2→h3
  $('h1').each((_, el) => {
    const inner = $(el).html() || '';
    $(el).replaceWith(`<h3>${inner}</h3>`);
  });
  $('h2').each((_, el) => {
    const inner = $(el).html() || '';
    $(el).replaceWith(`<h3>${inner}</h3>`);
  });

  // Wrap tables
  $('table').each((_, el) => {
    const outer = $.html(el);
    $(el).replaceWith(`<div class="table-wrap">${outer}</div>`);
  });

  $('img').addClass('max-w-full rounded-lg my-4 mx-auto block');

  return $('body').html() || '';
}

/** Parse .xlsx → HTML table string */
function xlsxToHtml(filePath, label) {
  try {
    const wb    = XLSX.readFile(filePath);
    const ws    = wb.Sheets[wb.SheetNames[0]];
    const data  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (!data.length) return `<p><em>Empty spreadsheet</em></p>`;

    // Find the last non-empty column for each row to avoid excessive blank cols
    const maxCols = Math.max(...data.map(row => {
      for (let i = row.length - 1; i >= 0; i--) {
        if (String(row[i]).trim()) return i + 1;
      }
      return 0;
    }));

    const rows = data
      .filter(row => row.slice(0, maxCols).some(c => String(c).trim()))  // skip fully blank rows
      .map((row, ri) => {
        const tag  = ri === 0 ? 'th' : 'td';
        const cols = row.slice(0, maxCols).map(c =>
          `<${tag}>${String(c).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</${tag}>`
        ).join('');
        return `<tr>${cols}</tr>`;
      })
      .join('\n');

    return `<div class="table-wrap">\n<table>\n<tbody>\n${rows}\n</tbody>\n</table>\n</div>`;
  } catch (err) {
    console.warn(`  ⚠ Could not parse xlsx: ${err.message}`);
    const safeName = sanitizeFilename(path.basename(filePath));
    fs.copyFileSync(filePath, path.join(PDF_DIR, safeName));
    return `<div style="margin:1rem 0;padding:0.875rem 1rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
  <p style="margin:0 0 0.5rem;font-size:0.8rem;font-weight:600;color:#475569;">📊 ${label || path.basename(filePath)}</p>
  <a href="/pdfs/${SLUG}/${safeName}" target="_blank" style="font-size:0.8rem;color:#2563eb;">⬇ Download spreadsheet</a>
</div>`;
  }
}

/** Copy image to public/images/neuro-on-call/, return public URL */
function copyImage(srcName, label) {
  const srcPath  = path.join(ON_CALL, srcName);
  if (!fs.existsSync(srcPath)) {
    console.warn(`  ⚠ Image not found: ${srcName}`);
    return null;
  }
  const safeName = sanitizeFilename(srcName);
  fs.copyFileSync(srcPath, path.join(IMG_DIR, safeName));
  const altText  = label || srcName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  return `<figure style="margin:1.25rem 0;">
  <img src="/images/${SLUG}/${safeName}" alt="${altText}" style="max-width:100%;border-radius:10px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.08);display:block;margin:0 auto;" />
  ${label ? `<figcaption style="text-align:center;font-size:0.75rem;color:#64748b;margin-top:0.5rem;font-style:italic;">${label}</figcaption>` : ''}
</figure>`;
}

/** Copy PDF to public/pdfs/neuro-on-call/, return embed HTML */
function copyPdf(srcName, label) {
  const srcPath  = path.join(ON_CALL, srcName);
  if (!fs.existsSync(srcPath)) {
    console.warn(`  ⚠ PDF not found: ${srcName}`);
    return null;
  }
  const safeName = sanitizeFilename(srcName);
  const destPath = path.join(PDF_DIR, safeName);
  fs.copyFileSync(srcPath, destPath);

  const displayLabel = label || srcName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  return `<div style="margin:1.25rem 0;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
  <div style="padding:0.6rem 0.875rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
    <span style="font-size:0.8rem;font-weight:600;color:#1e293b;">📄 ${displayLabel}</span>
    <a href="/pdfs/${SLUG}/${safeName}" target="_blank" rel="noopener" style="font-size:0.75rem;color:#2563eb;white-space:nowrap;text-decoration:none;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:0.25rem 0.6rem;">Open / Download ↗</a>
  </div>
  <object data="/pdfs/${SLUG}/${safeName}" type="application/pdf" width="100%" style="height:650px;display:block;background:#fafafa;">
    <div style="padding:2rem;text-align:center;">
      <p style="margin:0 0 0.75rem;color:#64748b;font-size:0.875rem;">PDF preview not available.</p>
      <a href="/pdfs/${SLUG}/${safeName}" target="_blank" rel="noopener" style="color:#2563eb;font-size:0.875rem;">📄 Open PDF</a>
    </div>
  </object>
</div>`;
}

// ── Subsection header HTML ───────────────────────────────────────────────────
function subsectionHeader({ id, title, desc, accent, bg, border, icon }) {
  return `<div style="display:flex;align-items:flex-start;gap:0.875rem;background:${bg};border-left:4px solid ${accent};border-radius:0 10px 10px 0;padding:1rem 1.25rem 1rem 1.25rem;margin:2.5rem 0 1.25rem;">
  <span style="font-size:1.75rem;line-height:1;flex-shrink:0;margin-top:0.1rem;" aria-hidden="true">${icon}</span>
  <div style="flex:1;min-width:0;">
    <h2 id="${id}" style="margin:0 0 0.25rem;padding:0;font-size:1.1rem;font-weight:700;color:${accent};border:none;background:none;">${title}</h2>
    <p style="margin:0;font-size:0.75rem;color:${accent};opacity:0.85;">${desc}</p>
  </div>
</div>`;
}

// ── Build section HTML ───────────────────────────────────────────────────────
const toc = SUBSECTIONS.map(s => ({ level: 2, text: s.title, id: s.id }));
const searchChunks = [];
let html = '';

for (const sub of SUBSECTIONS) {
  console.log(`\nBuilding subsection: ${sub.title}`);
  let subHtml = subsectionHeader(sub);
  let subText = '';

  for (const file of sub.files) {
    const srcPath = path.join(ON_CALL, file.name);
    if (!fs.existsSync(srcPath)) {
      console.warn(`  ⚠ File not found, skipping: ${file.name}`);
      continue;
    }

    console.log(`  → ${file.type}: ${file.name}`);

    if (file.type === 'image') {
      const imgHtml = copyImage(file.name, file.label || null);
      if (imgHtml) {
        subHtml += imgHtml;
        subText += ` [image: ${file.label || file.name}]`;
      }
    } else if (file.type === 'pdf') {
      const pdfHtml = copyPdf(file.name, file.label || null);
      if (pdfHtml) {
        subHtml += pdfHtml;
        subText += ` [pdf: ${file.label || file.name}]`;
      }
    } else if (file.type === 'docx') {
      const docHtml = await extractDocx(srcPath);
      const $tmp = cheerio.load(docHtml);
      subText += ' ' + $tmp.text();
      subHtml += `<div class="doc-content" style="margin-top:1rem;">${docHtml}</div>`;
    } else if (file.type === 'xlsx') {
      const tableHtml = xlsxToHtml(srcPath, file.label || null);
      const $tmp = cheerio.load(tableHtml);
      subText += ' ' + $tmp.text();
      subHtml += tableHtml;
    }
  }

  // Build a search chunk per subsection
  if (subText.trim()) {
    searchChunks.push({
      heading: sub.title,
      id:      sub.id,
      text:    subText.trim().slice(0, 600),
    });
  }

  html += `<section aria-label="${sub.title}">\n${subHtml}\n</section>\n`;
}

// ── Write section JSON ───────────────────────────────────────────────────────
const sectionData = {
  name: NAME, slug: SLUG,
  icon: META.icon, color: META.color,
  toc,
  html,
  imageCount: SUBSECTIONS.reduce((n, s) => n + s.files.filter(f => f.type === 'image').length, 0),
  chunkCount: searchChunks.length,
};

fs.writeFileSync(path.join(DATA_DIR, `${SLUG}.json`), JSON.stringify(sectionData, null, 2));
console.log(`\n  ✓ Wrote ${SLUG}.json  (${toc.length} subsections)`);

// ── Update index.json (append On-Call at end) ────────────────────────────────
const indexPath = path.join(DATA_DIR, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
const filteredIndex = index.filter(s => s.slug !== SLUG);
filteredIndex.push({
  name: NAME, slug: SLUG,
  icon: META.icon, color: META.color,
  tocCount:   toc.length,
  imageCount: sectionData.imageCount,
});
fs.writeFileSync(indexPath, JSON.stringify(filteredIndex, null, 2));

// ── Update search.json ───────────────────────────────────────────────────────
const searchPath   = path.join(DATA_DIR, 'search.json');
const allChunks    = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));
const filtered     = allChunks.filter(c => c.section !== SLUG);
for (const c of searchChunks) filtered.push({ section: SLUG, sectionName: NAME, ...c });
fs.writeFileSync(searchPath, JSON.stringify(filtered, null, 2));
fs.copyFileSync(searchPath, path.join(PUBLIC_DIR, 'search.json'));

console.log(`\n✅ Neuro On-Call done — ${SUBSECTIONS.length} subsections, ${sectionData.imageCount} images`);
