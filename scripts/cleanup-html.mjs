/**
 * cleanup-html.mjs
 * Cheerio-based HTML cleanup for all section JSON files.
 * Idempotent — safe to run multiple times.
 *
 * Transforms:
 *  1. Flatten empty-wrapper list nesting (li with no text, only nested ul/ol)
 *  2. Strip <p>&nbsp;</p> and empty <p> spacers
 *  3. Auto-link bare https:// URLs in text nodes
 *  4. Wrap unwrapped <table> in .table-wrap
 *  5. Convert 1-column tables to callout divs
 *  6. Make PDF embeds responsive (replace inline height with .pdf-embed class)
 *
 * Run: node scripts/cleanup-html.mjs
 */

import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadSectionFiles() {
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.json' && f !== 'search.json')
    .map(f => ({
      file: f,
      path: path.join(DATA_DIR, f),
      data: JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')),
    }));
}

// ── Transform 1: Flatten empty-wrapper list nesting ──────────────────────────
// Remove <li> that contain no direct text, only a nested <ul> or <ol>.
// The children of the nested list get promoted to the parent list.
function flattenEmptyListWrappers($) {
  let totalFixed = 0;
  let changed = true;
  while (changed) {
    changed = false;
    $('li').each(function () {
      const $li = $(this);
      // Get direct text content (not from children)
      const directText = $li.contents().filter(function () {
        return this.type === 'text';
      }).text().trim();

      if (directText.length > 0) return; // li has its own text, keep it

      // Check if li has only a single child that is ul or ol (and no other element children with text)
      const children = $li.children();
      const nestedList = children.filter('ul, ol');

      if (nestedList.length === 0) return; // no nested list

      // Check that li has no meaningful non-list children
      const nonListChildren = children.not('ul, ol');
      let hasTextContent = false;
      nonListChildren.each(function () {
        if ($(this).text().trim().length > 0) hasTextContent = true;
      });
      if (hasTextContent) return; // li has text in other elements, keep it

      // li is just a wrapper for a nested list — unwrap it
      const $parentList = $li.parent('ul, ol');
      if ($parentList.length === 0) return;

      // Move nested list's children up to replace this li
      nestedList.each(function () {
        $(this).children().each(function () {
          $li.before(this);
        });
      });
      $li.remove();
      totalFixed++;
      changed = true;
    });
  }
  return totalFixed;
}

// ── Transform 2: Strip spacer paragraphs ─────────────────────────────────────
function stripSpacerParagraphs($) {
  let count = 0;
  $('p').each(function () {
    const $p = $(this);
    const text = $p.text().trim();
    const html = $p.html() || '';
    // Match empty, whitespace-only, or &nbsp;-only paragraphs
    if (text === '' || text === '\u00a0' || /^(\s|&nbsp;)*$/i.test(html)) {
      $p.remove();
      count++;
    }
  });
  return count;
}

// ── Transform 3: Auto-link bare URLs ─────────────────────────────────────────
function autoLinkUrls($) {
  let count = 0;
  const urlRegex = /(https?:\/\/[^\s<>"')\]]+)/g;

  // Walk all text nodes not inside <a>, <code>, <pre>
  $('body *').contents().filter(function () {
    return this.type === 'text';
  }).each(function () {
    const $node = $(this);
    // Check if inside <a>, <code>, or <pre>
    if ($node.closest('a, code, pre').length > 0) return;

    const text = $node[0].data;
    if (!urlRegex.test(text)) return;
    urlRegex.lastIndex = 0; // reset regex

    const replaced = text.replace(urlRegex, (url) => {
      count++;
      return `<a href="${url}">${url}</a>`;
    });

    if (replaced !== text) {
      $node.replaceWith(replaced);
    }
  });
  return count;
}

// ── Transform 4: Wrap unwrapped tables ───────────────────────────────────────
function wrapUnwrappedTables($) {
  let count = 0;
  $('table').each(function () {
    const $table = $(this);
    const $parent = $table.parent();
    if ($parent.hasClass('table-wrap')) return; // already wrapped
    if ($parent.hasClass('callout-box')) return; // will be converted
    $table.wrap('<div class="table-wrap"></div>');
    count++;
  });
  return count;
}

// ── Transform 5: Convert 1-column tables to callout divs ─────────────────────
function convertOneColumnTables($) {
  let count = 0;
  $('table').each(function () {
    const $table = $(this);
    const rows = $table.find('tr');
    if (rows.length === 0) return;

    // Check if every row has exactly 1 cell
    let allSingleCell = true;
    rows.each(function () {
      const cells = $(this).find('td, th');
      if (cells.length !== 1) {
        allSingleCell = false;
        return false; // break
      }
    });

    if (!allSingleCell) return;

    // Build callout content from cell contents
    const contents = [];
    rows.each(function () {
      const cellHtml = $(this).find('td, th').first().html() || '';
      if (cellHtml.trim()) {
        contents.push(cellHtml.trim());
      }
    });

    const calloutHtml = `<div class="callout-box">${contents.join('\n')}</div>`;

    // If table is inside a .table-wrap, replace the wrapper too
    const $parent = $table.parent();
    if ($parent.hasClass('table-wrap')) {
      $parent.replaceWith(calloutHtml);
    } else {
      $table.replaceWith(calloutHtml);
    }
    count++;
  });
  return count;
}

// ── Transform 6: Make PDF embeds responsive ──────────────────────────────────
function makePdfEmbedsResponsive($) {
  let count = 0;
  $('object').each(function () {
    const $obj = $(this);
    const type = $obj.attr('type') || '';
    const data = $obj.attr('data') || '';
    if (!type.includes('pdf') && !data.endsWith('.pdf')) return;

    // Check if already processed
    const existing = $obj.attr('class') || '';
    if (existing.includes('pdf-embed')) return;

    // Remove inline height style and add class
    const style = $obj.attr('style') || '';
    const newStyle = style
      .replace(/height\s*:\s*\d+px\s*;?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (newStyle) {
      $obj.attr('style', newStyle);
    } else {
      $obj.removeAttr('style');
    }

    $obj.attr('class', (existing + ' pdf-embed').trim());
    count++;
  });
  return count;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const sections = loadSectionFiles();
const totals = {
  flattenedLists: 0,
  strippedSpacers: 0,
  autoLinkedUrls: 0,
  wrappedTables: 0,
  calloutBoxes: 0,
  responsivePdfs: 0,
};

console.log(`\nProcessing ${sections.length} section files...\n`);

for (const section of sections) {
  if (!section.data.html) {
    console.log(`  Skipping ${section.file} (no html field)`);
    continue;
  }
  const $ = cheerio.load(section.data.html, { decodeEntities: false });
  const slug = section.data.slug || section.file.replace('.json', '');

  const f1 = flattenEmptyListWrappers($);
  const f2 = stripSpacerParagraphs($);
  const f3 = autoLinkUrls($);
  const f4 = wrapUnwrappedTables($);
  const f5 = convertOneColumnTables($);
  const f6 = makePdfEmbedsResponsive($);

  const anyChanges = f1 + f2 + f3 + f4 + f5 + f6;
  if (anyChanges > 0) {
    // Extract body content (cheerio wraps in <html><body>)
    section.data.html = $('body').html() || section.data.html;
    fs.writeFileSync(section.path, JSON.stringify(section.data, null, 2), 'utf-8');

    console.log(`  ${slug}:`);
    if (f1) console.log(`    ✓ Flattened ${f1} empty list wrappers`);
    if (f2) console.log(`    ✓ Stripped ${f2} spacer paragraphs`);
    if (f3) console.log(`    ✓ Auto-linked ${f3} bare URLs`);
    if (f4) console.log(`    ✓ Wrapped ${f4} unwrapped tables`);
    if (f5) console.log(`    ✓ Converted ${f5} single-column tables to callout boxes`);
    if (f6) console.log(`    ✓ Made ${f6} PDF embeds responsive`);
  }

  totals.flattenedLists += f1;
  totals.strippedSpacers += f2;
  totals.autoLinkedUrls += f3;
  totals.wrappedTables += f4;
  totals.calloutBoxes += f5;
  totals.responsivePdfs += f6;
}

console.log(`\n── Summary ──────────────────────────────────────`);
console.log(`  Flattened list wrappers : ${totals.flattenedLists}`);
console.log(`  Stripped spacers        : ${totals.strippedSpacers}`);
console.log(`  Auto-linked URLs        : ${totals.autoLinkedUrls}`);
console.log(`  Wrapped tables          : ${totals.wrappedTables}`);
console.log(`  Callout box conversions : ${totals.calloutBoxes}`);
console.log(`  Responsive PDF embeds   : ${totals.responsivePdfs}`);
console.log(`  Total fixes             : ${Object.values(totals).reduce((a, b) => a + b, 0)}`);
console.log(`──────────────────────────────────────────────────\n`);
