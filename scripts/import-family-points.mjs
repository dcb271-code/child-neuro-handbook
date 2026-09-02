#!/usr/bin/env node
/**
 * Sync the Family Points entry log from a "Points Tracker" CSV export.
 *
 *   node scripts/import-family-points.mjs <tracker.csv>            # dry run
 *   FP_PASSWORD=… node scripts/import-family-points.mjs f.csv --apply
 *   FP_PASSWORD=… node scripts/import-family-points.mjs f.csv --apply --prune
 *
 * Flags
 *   --apply   actually write (default is a dry run that changes nothing)
 *   --prune   also delete live entries that are absent from the CSV
 *   --url X   target origin (default https://child-neuro-handbook.vercel.app)
 *
 * The shared password is read from FP_PASSWORD so it never lands in the repo
 * or in shell history when set via a leading space.
 *
 * Month cells hold a COUNT, not a point total. A cell whose value happens to
 * equal the task's point value is almost certainly a miskeyed point total, so
 * the script refuses to guess and stops — rerun after fixing the sheet, or
 * pass --assume-one to treat those cells as a single occurrence.
 */
import { readFileSync } from 'node:fs';

const MONTHS = ['July','August','September','October','November','December',
                'January','February','March','April','May','June'];

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith('--'));
const has = (f) => args.includes(f);
const origin = (args[args.indexOf('--url') + 1] && has('--url'))
  ? args[args.indexOf('--url') + 1]
  : 'https://child-neuro-handbook.vercel.app';

if (!csvPath) {
  console.error('usage: node scripts/import-family-points.mjs <tracker.csv> [--apply] [--prune] [--url ORIGIN]');
  process.exit(1);
}

/** Minimal RFC-4180 row splitter — the export quotes fields containing commas. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Read the roster and task catalog straight out of config.ts — single source of truth. */
function readConfig() {
  const src = readFileSync(new URL('../lib/family-points/config.ts', import.meta.url), 'utf8');
  const members = [...src.matchAll(/\{ name: '([^']+)',\s*pgy: \d+, teamId: '([^']+)' \}/g)]
    .map((m) => m[1]);
  const tasks = [...src.matchAll(/\{ id: '([^']+)',\s*label: '([^']+)',\s*points: (\d+) \}/g)]
    .map((m) => ({ id: m[1], label: m[2], points: Number(m[3]) }));
  if (!members.length || !tasks.length) throw new Error('could not parse config.ts');
  return { members, tasks };
}

const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
/** Spreadsheet labels differ from the site's in punctuation only. */
const canon = (s) => norm(s).replace(/[^a-z0-9]/g, '');

const { members, tasks } = readConfig();
const taskByLabel = new Map(tasks.map((t) => [canon(t.label), t]));
const memberSet = new Set(members);

const rows = parseCsv(readFileSync(csvPath, 'utf8'));
const headerIdx = rows.findIndex((r) => r[0]?.trim() === 'Team' && r[1]?.trim() === 'Member');
if (headerIdx < 0) throw new Error('could not find the "Team,Member,Task,..." header row');

const entries = [];
const problems = [];
for (const r of rows.slice(headerIdx + 1)) {
  if (r.length < 16 || !r[1]?.trim()) continue;
  const rawMember = r[1].trim();
  const member = rawMember.replace(/\s*\(PGY\d\)\s*$/i, '').trim();
  const label = r[2].trim();
  const points = Number(r[3]);
  const task = taskByLabel.get(canon(label));

  if (!memberSet.has(member)) { problems.push(`unknown resident: "${rawMember}"`); continue; }
  if (!task) { problems.push(`unknown task: "${label}"`); continue; }
  if (task.points !== points) {
    problems.push(`point value differs for "${label}": sheet ${points}, site ${task.points}`);
  }

  MONTHS.forEach((month, i) => {
    const cell = Number(r[4 + i]);
    if (!cell) return;
    if (cell === points && cell > 1) {
      if (has('--assume-one')) {
        entries.push({ member, taskId: task.id, month, count: 1 });
      } else {
        problems.push(
          `${member} / ${label} / ${month}: cell is ${cell}, which equals the task's point ` +
          `value — that is a count of ${cell}, worth ${cell * points} points. If a single ` +
          `occurrence was meant, fix the sheet or rerun with --assume-one.`,
        );
      }
      return;
    }
    entries.push({ member, taskId: task.id, month, count: cell });
  });
}

const key = (e) => `${e.member}|${e.taskId}|${e.month}`;
const pts = (e) => tasks.find((t) => t.id === e.taskId).points * e.count;

const res = await fetch(`${origin}/api/family-points/entries/`, { headers: { accept: 'application/json' } });
if (!res.ok) throw new Error(`could not read live entries: ${res.status}`);
const live = (await res.json()).entries ?? [];
const liveKeys = new Set(live.map(key));
const csvKeys = new Set(entries.map(key));

const toAdd = entries.filter((e) => !liveKeys.has(key(e)));
const stale = live.filter((e) => !csvKeys.has(key(e)));

console.log(`\ntarget      ${origin}`);
console.log(`csv         ${entries.length} entries`);
console.log(`live        ${live.length} entries\n`);

if (problems.length) {
  console.log('PROBLEMS — nothing will be written:');
  for (const p of problems) console.log(`  ! ${p}`);
  console.log();
}
console.log(`TO ADD (${toAdd.length}):`);
for (const e of toAdd) console.log(`  + ${e.member.padEnd(24)} ${e.taskId.padEnd(24)} ${e.month.padEnd(9)} x${e.count}  ${pts(e)} pts`);
console.log(`\nON SITE BUT NOT IN CSV (${stale.length}):`);
for (const e of stale) console.log(`  - ${e.member.padEnd(24)} ${e.taskId.padEnd(24)} ${e.month.padEnd(9)} x${e.count}${has('--prune') ? '   [will delete]' : '   [left alone]'}`);

if (problems.length) process.exit(1);
if (!has('--apply')) {
  console.log('\nDry run. Re-run with --apply to write.');
  process.exit(0);
}

const password = process.env.FP_PASSWORD;
if (!password) { console.error('\nFP_PASSWORD is not set.'); process.exit(1); }

const auth = await fetch(`${origin}/api/resources/auth/`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password }),
});
if (!auth.ok) { console.error(`\nlogin failed: ${auth.status}`); process.exit(1); }
const cookie = (auth.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
if (!cookie) { console.error('\nno session cookie returned'); process.exit(1); }

// Every write is a read-modify-write against one JSON blob, so writes must not
// overlap: a second write that reads before the first has landed will drop the
// first one's rows. Prune first (it works off ids we already hold), then add,
// with a pause between so each write is observable to the next.
const settle = () => new Promise((r) => setTimeout(r, 2500));

if (has('--prune')) {
  for (const e of stale) {
    const del = await fetch(`${origin}/api/family-points/entries/`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ id: e.id }),
    });
    console.log(del.ok ? `deleted ${e.member} / ${e.taskId}` : `delete failed for ${e.id}: ${del.status}`);
    await settle();
  }
}

if (toAdd.length) {
  const post = await fetch(`${origin}/api/family-points/entries/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ entries: toAdd }),
  });
  const body = await post.json().catch(() => ({}));
  if (!post.ok) { console.error(`\nadd failed: ${post.status} ${JSON.stringify(body)}`); process.exit(1); }
  console.log(`\nadded ${body.added}`);
}

// Confirm what actually landed rather than trusting the write response.
await settle();
const after = await fetch(`${origin}/api/family-points/entries/`, { headers: { accept: 'application/json' } });
const finalCount = ((await after.json()).entries ?? []).length;
const expected = live.length - (has('--prune') ? stale.length : 0) + toAdd.length;
console.log(`\nverify: ${finalCount} entries live, expected ${expected}` +
  (finalCount === expected ? ' — OK' : ' — MISMATCH, re-run the dry run and check'));
console.log('\ndone.');
