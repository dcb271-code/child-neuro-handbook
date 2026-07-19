/**
 * _fix-table-headers.mjs
 * Converts first-row <td> cells to <th> when all cells contain <strong>/<b> text
 * (indicating they're headers). Also wraps in <thead>/<tbody> for proper semantics.
 * This improves mobile readability because our CSS styles th differently from td
 * (sticky, background color, font weight).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'src', 'data');

const skip = new Set(['index.json', 'search.json']);
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !skip.has(f));
let totalFixed = 0;

for (const file of files) {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!data.html) continue;
  const $ = cheerio.load(data.html, { decodeEntities: false });
  let changed = false;

  $('table').each((i, table) => {
    // Skip tables that already have <th> elements
    if ($(table).find('th').length > 0) return;

    const firstRow = $(table).find('tr').first();
    const tds = firstRow.find('td');
    if (tds.length < 3) return;

    // Check if all cells in first row contain bold text (headers)
    let allBold = true;
    let nonEmpty = 0;
    tds.each((j, cell) => {
      const text = $(cell).text().trim();
      if (text.length === 0) return; // skip empty cells
      nonEmpty++;
      const hasStrong = $(cell).find('strong').length > 0 || $(cell).find('b').length > 0;
      if (!hasStrong) allBold = false;
    });

    if (!allBold || nonEmpty < 2) return;

    // Convert td to th
    tds.each((j, cell) => {
      const inner = $(cell).html();
      const attrs = {};
      // Preserve colspan, rowspan, style etc.
      const el = $(cell);
      for (const attr of Object.keys(el.attr() || {})) {
        attrs[attr] = el.attr(attr);
      }
      const th = $('<th></th>').html(inner);
      for (const [k, v] of Object.entries(attrs)) {
        th.attr(k, v);
      }
      $(cell).replaceWith(th);
    });

    // Wrap in thead/tbody if not already
    if ($(table).find('thead').length === 0) {
      const headerRow = $(table).find('tr').first();
      const headerHtml = $.html(headerRow);
      headerRow.remove();

      const bodyRows = $(table).find('tr');
      if (bodyRows.length > 0 && $(table).find('tbody').length === 0) {
        bodyRows.wrapAll('<tbody></tbody>');
      }
      $(table).prepend('<thead>' + headerHtml + '</thead>');
    }

    changed = true;
    totalFixed++;
  });

  if (changed) {
    data.html = $('body').html() || data.html;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  Fixed: ${file}`);
  }
}

console.log(`\nTotal tables fixed: ${totalFixed}`);
