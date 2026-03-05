#!/usr/bin/env node
/**
 * build-call-schedule.mjs
 *
 * Reads the faculty call schedule XLSX, converts each monthly sheet to
 * a standalone HTML page with month tabs, copies files to public/,
 * and appends an "On Call Resources" section to neuro-on-call.json.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// ── Paths ────────────────────────────────────────────────────────────────────
const XLSX_SRC  = process.env.XLSX_SRC || 'C:/Users/dylan/Child Neuro Handbook Word/Faculty Call Schedule July 7.25 through 6.26.xlsx';
const PUBLIC    = 'public';
const PDF_DIR   = path.join(PUBLIC, 'pdfs/neuro-on-call');
const DEST_XLSX = path.join(PDF_DIR, 'call-schedule.xlsx');
const DEST_DIR  = path.join(PUBLIC, 'call-schedule');
const DEST_HTML = path.join(DEST_DIR, 'index.html');
const DATA_FILE = 'src/data/neuro-on-call.json';

// ── Relevant sheets (July 2025 – June 2026) ─────────────────────────────────
const RELEVANT_SHEETS = [
  'July 2025', 'August 2025', 'September 2025', 'October 2025',
  'November 2025', 'December 2025', 'January 2026', 'February 2026',
  'March 2026', 'April 2026', 'May 2026', 'June 2026',
];

// ── 1. Read workbook ─────────────────────────────────────────────────────────
console.log('Reading XLSX…');
const wb = XLSX.readFile(XLSX_SRC, { cellStyles: true });

// ── 2. Convert sheets to HTML tables with cell background colors ─────────────
const sheetHtmls = [];
for (const name of RELEVANT_SHEETS) {
  const ws = wb.Sheets[name];
  if (!ws) { console.warn(`  ⚠ Sheet not found: ${name}`); continue; }

  const sheetId = `sheet-${name.replace(/\s+/g, '-').toLowerCase()}`;

  // sheet_to_html gives a full HTML doc; extract just the <table>
  let raw = XLSX.utils.sheet_to_html(ws, { id: sheetId });
  const tableStart = raw.indexOf('<table');
  const tableEnd = raw.lastIndexOf('</table>') + 8;
  let tableHtml = raw.substring(tableStart, tableEnd);

  // Inject background colors from cell styles
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell || !cell.s || cell.s.patternType !== 'solid') continue;
      const rgb = cell.s.fgColor && cell.s.fgColor.rgb;
      if (!rgb) continue;

      const cellId = `${sheetId}-${addr}`;
      // Add inline background style to the td with this id
      const idAttr = `id="${cellId}"`;
      const idx = tableHtml.indexOf(idAttr);
      if (idx < 0) continue;

      // Find the opening <td that contains this id
      const tdStart = tableHtml.lastIndexOf('<td', idx);
      if (tdStart < 0) continue;

      // Check if td already has a style attr
      const tdTag = tableHtml.substring(tdStart, idx + idAttr.length + 1);
      if (tdTag.includes('style="')) continue; // skip if already styled

      // Insert style after <td
      tableHtml = tableHtml.substring(0, tdStart + 3) +
        ` style="background:#${rgb}"` +
        tableHtml.substring(tdStart + 3);
    }
  }

  sheetHtmls.push({ name, html: tableHtml });
  console.log(`  ✓ ${name} (${tableHtml.length} chars)`);
}

// ── 3. Determine current month for auto-selection ────────────────────────────
const now = new Date();
const monthNames = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const currentMonthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
const defaultIdx = RELEVANT_SHEETS.indexOf(currentMonthLabel);
const activeIdx = defaultIdx >= 0 ? defaultIdx : 0;
console.log(`Current month: ${currentMonthLabel} (tab index ${activeIdx})`);

// ── 4. Generate standalone HTML page ─────────────────────────────────────────
const standalonePage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Faculty Call Schedule</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #fff;
    color: #1e293b;
    font-size: 13px;
  }

  /* Tab bar */
  .tab-bar {
    display: flex;
    gap: 4px;
    padding: 8px 10px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .tab-bar::-webkit-scrollbar { height: 3px; }
  .tab-bar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  .tab-btn {
    flex-shrink: 0;
    padding: 5px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #fff;
    color: #475569;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }
  .tab-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
  .tab-btn.active {
    background: #2563eb;
    color: #fff;
    border-color: #2563eb;
  }

  /* Sheet containers */
  .sheet { display: none; padding: 8px; overflow: auto; }
  .sheet.active { display: block; }

  /* Table styling */
  table {
    border-collapse: collapse;
    width: 100%;
    min-width: 700px;
    table-layout: fixed;
    font-size: 12px;
  }
  td {
    border: 1px solid #e2e8f0;
    padding: 4px 6px;
    vertical-align: top;
    overflow: hidden;
    text-overflow: ellipsis;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  /* Title row */
  tr:nth-child(1) td { font-weight: 600; font-size: 11px; color: #64748b; }
  tr:nth-child(2) td {
    font-weight: 700;
    font-size: 14px;
    text-align: center;
  }
  /* Column headers row */
  tr:nth-child(3) td {
    font-weight: 700;
    font-size: 11px;
    text-align: center;
  }
  /* Month header row */
  tr:nth-child(4) td {
    font-weight: 700;
    font-size: 13px;
    text-align: center;
  }
  /* Day of week row */
  tr:nth-child(5) td {
    background: #f1f5f9;
    font-weight: 600;
    font-size: 11px;
    color: #475569;
    text-align: center;
  }
</style>
</head>
<body>
<div class="tab-bar" id="tabBar">
${sheetHtmls.map((s, i) => {
  // Short label: "Jul 25", "Aug 25", etc.
  const parts = s.name.split(' ');
  const short = parts[0].substring(0, 3) + ' ' + parts[1].substring(2);
  return `  <button class="tab-btn${i === activeIdx ? ' active' : ''}" onclick="showSheet(${i})">${short}</button>`;
}).join('\n')}
</div>

${sheetHtmls.map((s, i) =>
  `<div class="sheet${i === activeIdx ? ' active' : ''}" id="sheet-${i}">\n${s.html}\n</div>`
).join('\n')}

<script>
function showSheet(idx) {
  document.querySelectorAll('.sheet').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });
}
</script>
</body>
</html>`;

// ── 5. Write files ───────────────────────────────────────────────────────────
fs.mkdirSync(PDF_DIR, { recursive: true });
fs.mkdirSync(DEST_DIR, { recursive: true });
fs.copyFileSync(XLSX_SRC, DEST_XLSX);
console.log(`Copied XLSX → ${DEST_XLSX}`);

fs.writeFileSync(DEST_HTML, standalonePage);
console.log(`Wrote HTML → ${DEST_HTML} (${standalonePage.length} chars)`);

// ── 6. Update neuro-on-call.json ─────────────────────────────────────────────
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Add TOC entries
const newTocEntries = [
  { level: 1, text: 'On Call Resources', id: 'on-call-resources' },
  { level: 2, text: 'Faculty Call Schedule', id: 'faculty-call-schedule' },
];

// Check if already added
if (!data.toc.find(t => t.id === 'on-call-resources')) {
  data.toc.push(...newTocEntries);
  console.log('Added TOC entries');
} else {
  console.log('TOC entries already exist, skipping');
}

// Build embed HTML (matches PDF embed pattern)
const embedHtml = `
<section aria-label="On Call Resources">
<div style="display:flex;align-items:flex-start;gap:0.875rem;background:#ecfdf5;border-left:4px solid #059669;border-radius:0 10px 10px 0;padding:1rem 1.25rem 1rem 1.25rem;margin:2.5rem 0 1.25rem;">
  <span style="font-size:1.75rem;line-height:1;flex-shrink:0;margin-top:0.1rem;" aria-hidden="true">📋</span>
  <div style="flex:1;min-width:0;">
    <h2 id="on-call-resources" style="margin:0 0 0.25rem;padding:0;font-size:1.1rem;font-weight:700;color:#059669;border:none;background:none;">On Call Resources</h2>
    <p style="margin:0;font-size:0.75rem;color:#059669;opacity:0.85;">Schedules and reference materials for on-call coverage</p>
  </div>
</div>

<h3 id="faculty-call-schedule">Faculty Call Schedule</h3>
<div style="margin:1.25rem 0;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
  <div style="padding:0.6rem 0.875rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
    <span style="font-size:0.8rem;font-weight:600;color:#1e293b;">📅 Faculty Call Schedule (July 2025 – June 2026)</span>
    <a href="/pdfs/neuro-on-call/call-schedule.xlsx" download style="font-size:0.75rem;color:#2563eb;white-space:nowrap;text-decoration:none;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:0.25rem 0.6rem;">Download XLSX ↗</a>
  </div>
  <iframe src="/call-schedule/" class="spreadsheet-embed" width="100%" style="height:650px;display:block;border:none;background:#fafafa;"></iframe>
</div>
</section>
`;

// Remove old embed if re-running, then append
const marker = '<section aria-label="On Call Resources">';
const existingIdx = data.html.indexOf(marker);
if (existingIdx >= 0) {
  data.html = data.html.substring(0, existingIdx);
  console.log('Removed old On Call Resources section');
}
data.html += embedHtml;

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log('Updated neuro-on-call.json');
console.log('\nDone! ✓');
