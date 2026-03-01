/**
 * inject-epilepsy-images.mjs
 * Injects missing images into epilepsy.json without losing manual edits.
 *
 * Strategy:
 *  1. Run mammoth on Epilepsy.docx to get fresh HTML with <img> tags
 *  2. For each <img> in fresh HTML, find surrounding text context
 *  3. Match that context in the current epilepsy.json HTML
 *  4. Insert the <img> tag at the matched position
 *
 * Run: node scripts/inject-epilepsy-images.mjs
 */

import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT     = path.resolve(__dirname, '..');
const DOCS_DIR = 'C:/Users/dylan/Child Neuro Handbook Word';
const DATA_DIR = path.join(ROOT, 'src', 'data');

function normalise(t) {
  return t.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 120);
}

// ── 1. Fresh mammoth extraction (images already on disk) ─────────────────────

const docPath = path.join(DOCS_DIR, 'Epilepsy.docx');
let imgCounter = 0;

const result = await mammoth.convertToHtml(
  { path: docPath },
  {
    convertImage: mammoth.images.imgElement(async (image) => {
      const ext = (image.contentType || 'image/png').split('/')[1].replace('jpeg', 'jpg');
      const fname = `img-${++imgCounter}.${ext}`;
      // Don't write files — they're already on disk
      return { src: `/images/epilepsy/${fname}`, alt: '' };
    }),
  }
);

console.log(`Fresh extraction: ${imgCounter} images found\n`);

// ── 2. Parse fresh HTML to get image context ─────────────────────────────────

const $fresh = cheerio.load(result.value);

// For each image, capture: its src, the text of siblings before/after it
const imageContexts = [];

$fresh('img').each((i, el) => {
  const $img = $fresh(el);
  const src = $img.attr('src') || '';

  // Walk up to find the parent element, then look at previous/next siblings
  const $parent = $img.parent();

  // Get text of the containing element (paragraph or cell)
  const parentText = normalise($parent.text());

  // Previous sibling element text
  const prevTexts = [];
  let $prev = $parent.prev();
  for (let j = 0; j < 3 && $prev.length; j++) {
    const t = normalise($prev.text());
    if (t) prevTexts.unshift(t);
    $prev = $prev.prev();
  }

  // Next sibling element text
  const nextTexts = [];
  let $next = $parent.next();
  for (let j = 0; j < 3 && $next.length; j++) {
    const t = normalise($next.text());
    if (t) nextTexts.push(t);
    $next = $next.next();
  }

  // Is it inside a table?
  const inTable = $img.closest('table').length > 0;

  imageContexts.push({
    index: i + 1,
    src,
    parentText,
    prevTexts,
    nextTexts,
    inTable,
  });
});

console.log(`Found ${imageContexts.length} images with context\n`);

// ── 3. Match and inject into current HTML ────────────────────────────────────

const epiPath = path.join(DATA_DIR, 'epilepsy.json');
const epiData = JSON.parse(fs.readFileSync(epiPath, 'utf-8'));
let $current = cheerio.load(epiData.html, { decodeEntities: false });

let placed = 0;
let skipped = 0;
const report = [];

for (const ctx of imageContexts) {
  const imgTag = `<img src="${ctx.src}" alt="" class="max-w-full rounded-lg my-4 mx-auto block">`;

  // Check if this image is already in the HTML
  if (epiData.html.includes(ctx.src)) {
    report.push({ img: ctx.src, status: 'already-present' });
    continue;
  }

  // Strategy: find the best match among previous text context lines
  let inserted = false;

  // Try to find a matching element by prev text (most reliable anchor)
  for (let pi = ctx.prevTexts.length - 1; pi >= 0 && !inserted; pi--) {
    const searchText = ctx.prevTexts[pi];
    if (!searchText || searchText.length < 10) continue;

    // Search all elements in current HTML for matching text
    $current('h1, h2, h3, h4, p, li, div, td, th').each((_, el) => {
      if (inserted) return;
      const elText = normalise($current(el).text());
      // Check for a close match (contains the search text or vice versa)
      if (elText && searchText.length >= 10 && (elText.includes(searchText) || searchText.includes(elText))) {
        // Calculate how far back in prevTexts this was
        const distance = ctx.prevTexts.length - 1 - pi;

        // Navigate forward `distance` siblings from the match, then insert after
        let $target = $current(el);

        // If the matched element is inside a table, go to the table's wrapping div
        if ($target.closest('.table-wrap').length && !ctx.inTable) {
          $target = $target.closest('.table-wrap');
        }

        // Move forward to account for elements between the anchor and image position
        for (let step = 0; step < distance; step++) {
          const $next = $target.next();
          if ($next.length) $target = $next;
        }

        $target.after(imgTag);
        inserted = true;
      }
    });
  }

  // Fallback: try next text context
  if (!inserted) {
    for (let ni = 0; ni < ctx.nextTexts.length && !inserted; ni++) {
      const searchText = ctx.nextTexts[ni];
      if (!searchText || searchText.length < 10) continue;

      $current('h1, h2, h3, h4, p, li, div, td, th').each((_, el) => {
        if (inserted) return;
        const elText = normalise($current(el).text());
        if (elText && searchText.length >= 10 && (elText.includes(searchText) || searchText.includes(elText))) {
          let $target = $current(el);
          if ($target.closest('.table-wrap').length && !ctx.inTable) {
            $target = $target.closest('.table-wrap');
          }
          $target.before(imgTag);
          inserted = true;
        }
      });
    }
  }

  if (inserted) {
    placed++;
    report.push({ img: ctx.src, status: 'placed', anchor: ctx.prevTexts.slice(-1)[0] || ctx.nextTexts[0] || '?' });
    // Re-parse to keep DOM consistent for subsequent insertions
    const updatedHtml = $current('body').html() || '';
    $current = cheerio.load(updatedHtml, { decodeEntities: false });
  } else {
    skipped++;
    report.push({
      img: ctx.src,
      status: 'UNPLACED',
      prevTexts: ctx.prevTexts,
      nextTexts: ctx.nextTexts,
      inTable: ctx.inTable,
    });
  }
}

// ── 4. Save ──────────────────────────────────────────────────────────────────

const finalHtml = $current('body').html() || '';
epiData.html = finalHtml;

// Count actual img tags in final HTML
const finalImgCount = (finalHtml.match(/<img /g) || []).length;

fs.writeFileSync(epiPath, JSON.stringify(epiData, null, 2));

// ── 5. Report ────────────────────────────────────────────────────────────────

console.log(`\n── Results ──`);
console.log(`  Placed: ${placed}`);
console.log(`  Already present: ${report.filter(r => r.status === 'already-present').length}`);
console.log(`  Unplaced: ${skipped}`);
console.log(`  Total <img> in final HTML: ${finalImgCount}`);

if (skipped > 0) {
  console.log(`\n── Unplaced images (need manual review) ──`);
  for (const r of report.filter(r => r.status === 'UNPLACED')) {
    console.log(`  ${r.img}`);
    console.log(`    prevTexts: ${JSON.stringify(r.prevTexts)}`);
    console.log(`    nextTexts: ${JSON.stringify(r.nextTexts)}`);
    console.log(`    inTable: ${r.inTable}`);
  }
}

console.log(`\n✅ Done — ${finalImgCount} images now in epilepsy HTML`);
