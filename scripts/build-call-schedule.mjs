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
const XLSX_2627_SRC = process.env.XLSX_2627_SRC || 'C:/Users/dylan/Child Neuro Handbook Word/General_ICU Call 2026-2027 Calendar in Excel.xlsx';
const PUBLIC    = 'public';
const PDF_DIR   = path.join(PUBLIC, 'pdfs/neuro-on-call');
const DEST_XLSX = path.join(PDF_DIR, 'call-schedule.xlsx');
const DEST_XLSX_2627 = path.join(PDF_DIR, 'call-schedule-2026-2027.xlsx');
const DEST_DIR  = path.join(PUBLIC, 'call-schedule');
const DEST_HTML = path.join(DEST_DIR, 'index.html');
const DATA_FILE = 'src/data/neuro-on-call.json';

function excelSerialToMD(serial) {
  const d = new Date((serial - 25569) * 86400 * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function excelSerialToDate(serial) {
  return new Date((serial - 25569) * 86400 * 1000);
}

function isoDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Hand-curated bridge: covers 25-26 schedule gap until 26-27 flat sheet starts (6/22/26)
const BRIDGE_WEEKS = [
  { start: '2026-05-18', end: '2026-05-24', general: 'Barton',   icu: 'Lakhotia', notes: '' },
  { start: '2026-05-25', end: '2026-05-31', general: 'Marshall', icu: 'Lakhotia', notes: 'Memorial Day Mon 5/25' },
  { start: '2026-06-01', end: '2026-06-07', general: 'Lakhotia', icu: 'Marshall', notes: '' },
  { start: '2026-06-08', end: '2026-06-14', general: 'Hocker',   icu: 'Doll',     notes: '' },
  { start: '2026-06-15', end: '2026-06-21', general: 'Brock',    icu: 'Means',    notes: '' },
];

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Build 2026-2027 provisional schedule table ───────────────────────────────
function build2627Html() {
  if (!fs.existsSync(XLSX_2627_SRC)) {
    console.log('No 2026-2027 XLSX found, skipping that subsection');
    return '';
  }
  console.log('Reading 2026-2027 XLSX…');
  const wb = XLSX.readFile(XLSX_2627_SRC);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const trs = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    let week = r[0];
    const general = String(r[1] || '').trim();
    const icu = String(r[2] || '').trim();
    const notes = String(r[3] || '').trim();
    if (!week && !general && !icu) continue;
    if (typeof week === 'number') week = excelSerialToMD(week);
    week = String(week).trim();
    const isHoliday = !!notes;
    const bg = isHoliday ? '#fef3c7' : '';
    const cell = (v, align = 'left') => `<td style="border:1px solid #e2e8f0;padding:0.4rem 0.6rem;text-align:${align};${bg ? `background:${bg};` : ''}font-size:0.82rem;">${escapeHtml(v) || '&nbsp;'}</td>`;
    trs.push(`<tr>${cell(week)}${cell(general)}${cell(icu)}${cell(notes)}</tr>`);
  }

  const tableHtml = `
<h3 id="faculty-call-schedule-2627" style="margin-top:2rem;">Faculty Call Schedule (2026–2027)</h3>
<p style="margin:0.25rem 0 0.75rem;font-size:0.85rem;color:#64748b;">Provisional listing of General &amp; ICU attendings by week from the 2026–2027 spreadsheet. The fully formatted monthly calendar is not yet available; holiday weeks are highlighted.</p>
<div style="margin:1rem 0;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
  <div style="padding:0.6rem 0.875rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
    <span style="font-size:0.8rem;font-weight:600;color:#1e293b;">📅 General &amp; ICU Call (July 2026 – June 2027)</span>
    <a href="/pdfs/neuro-on-call/call-schedule-2026-2027.xlsx" download style="font-size:0.75rem;color:#2563eb;white-space:nowrap;text-decoration:none;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:0.25rem 0.6rem;">Download XLSX ↗</a>
  </div>
  <div class="table-wrap" style="overflow-x:auto;background:#fff;">
    <table style="border-collapse:collapse;width:100%;min-width:560px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="border:1px solid #e2e8f0;padding:0.5rem 0.6rem;text-align:left;font-size:0.78rem;font-weight:700;color:#475569;">Week</th>
          <th style="border:1px solid #e2e8f0;padding:0.5rem 0.6rem;text-align:left;font-size:0.78rem;font-weight:700;color:#475569;">General</th>
          <th style="border:1px solid #e2e8f0;padding:0.5rem 0.6rem;text-align:left;font-size:0.78rem;font-weight:700;color:#475569;">ICU</th>
          <th style="border:1px solid #e2e8f0;padding:0.5rem 0.6rem;text-align:left;font-size:0.78rem;font-weight:700;color:#475569;">Notes</th>
        </tr>
      </thead>
      <tbody>
${trs.map(t => '        ' + t).join('\n')}
      </tbody>
    </table>
  </div>
</div>
`;
  console.log(`  ✓ Built 2026-2027 table (${trs.length} rows)`);
  return tableHtml;
}

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

if (fs.existsSync(XLSX_2627_SRC)) {
  fs.copyFileSync(XLSX_2627_SRC, DEST_XLSX_2627);
  console.log(`Copied 2026-2027 XLSX → ${DEST_XLSX_2627}`);
}

const schedule2627Html = build2627Html();

fs.writeFileSync(DEST_HTML, standalonePage);
console.log(`Wrote HTML → ${DEST_HTML} (${standalonePage.length} chars)`);

// ── 6. Update neuro-on-call.json ─────────────────────────────────────────────
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Add TOC entries
const newTocEntries = [
  { level: 1, text: 'On Call Resources', id: 'on-call-resources' },
  { level: 2, text: 'Faculty Call Schedule', id: 'faculty-call-schedule' },
];
if (schedule2627Html) {
  newTocEntries.push({ level: 2, text: 'Faculty Call Schedule (2026–2027)', id: 'faculty-call-schedule-2627' });
}

// Remove any prior On Call Resources TOC entries, then re-add
data.toc = data.toc.filter(t =>
  t.id !== 'on-call-resources' &&
  t.id !== 'faculty-call-schedule' &&
  t.id !== 'faculty-call-schedule-2627'
);
data.toc.push(...newTocEntries);
console.log('Refreshed On Call Resources TOC entries');

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
${schedule2627Html}
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

// ── 7. Emit normalized weekly schedule JSON for homepage widget ──────────────
function build2627WeekEntries() {
  if (!fs.existsSync(XLSX_2627_SRC)) return [];
  const wb = XLSX.readFile(XLSX_2627_SRC);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const entries = [];
  let curYear = 2026; // first row is 6/22-6/26 in 2026
  let prevStartMonth = null;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const raw = r[0];
    const general = String(r[1] || '').trim();
    const icu = String(r[2] || '').trim();
    const notes = String(r[3] || '').trim();
    if (!raw && !general && !icu) continue;

    if (typeof raw === 'number') {
      // Single-day holiday row — the source XLSX has buggy serials, so don't trust
      // the value. Fold into the preceding week: extend that week's end by one day
      // and append the holiday note (covers Labor Day / MLK / Memorial Day pattern).
      if (entries.length === 0) continue;
      const prev = entries[entries.length - 1];
      const prevEnd = new Date(prev.end + 'T00:00:00Z');
      prevEnd.setUTCDate(prevEnd.getUTCDate() + 1);
      prev.end = isoDate(prevEnd);
      if (notes) prev.notes = prev.notes ? `${prev.notes}; ${notes} (Mon)` : `${notes} (Mon)`;
      continue;
    }
    const s = String(raw).trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\s*[-–]\s*(?:(\d{1,2})\/)?(\d{1,2})$/);
    if (!m) { console.warn(`  ⚠ Could not parse week range: "${s}"`); continue; }
    const sM = +m[1], sD = +m[2], eD = +m[4];
    const eM = m[3] ? +m[3] : sM;
    if (prevStartMonth !== null && sM < prevStartMonth) curYear++;
    prevStartMonth = sM;
    const sYear = curYear;
    const eYear = eM < sM ? curYear + 1 : curYear;
    const startD = new Date(Date.UTC(sYear, sM - 1, sD));
    const endD = new Date(Date.UTC(eYear, eM - 1, eD));
    entries.push({ start: isoDate(startD), end: isoDate(endD), general, icu, notes });
  }
  return entries;
}

const allWeeks = [...BRIDGE_WEEKS, ...build2627WeekEntries()].sort((a, b) => a.start.localeCompare(b.start));
const DATA_OUT_DIR = path.join(PUBLIC, 'data');
fs.mkdirSync(DATA_OUT_DIR, { recursive: true });
const WEEKS_FILE = path.join(DATA_OUT_DIR, 'call-weeks.json');
fs.writeFileSync(WEEKS_FILE, JSON.stringify(allWeeks, null, 2));
console.log(`Wrote ${allWeeks.length} weekly entries → ${WEEKS_FILE}`);

console.log('\nDone! ✓');
