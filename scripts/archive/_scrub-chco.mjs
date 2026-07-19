/**
 * Scrub Colorado/CHCO-specific references from all section data.
 * Replacements are graceful — generic alternatives preserve clinical content.
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

function loadJson(name) {
  const p = path.join(DATA_DIR, name);
  return { path: p, data: JSON.parse(fs.readFileSync(p, 'utf-8')) };
}

function saveJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

let totalFixes = 0;

function replace(obj, old, replacement, label) {
  if (obj.data.html.includes(old)) {
    obj.data.html = obj.data.html.split(old).join(replacement);
    totalFixes++;
    console.log(`  ✓ ${label}`);
    return true;
  }
  console.log(`  ✗ Not found: ${label}`);
  return false;
}

// ── epilepsy.json ──
console.log('\nepilepsy.json:');
const epi = loadJson('epilepsy.json');
replace(epi, 'CHCO Infantile Spasms Clinical Pathway', 'Infantile Spasms Clinical Pathway', 'CHCO Infantile Spasms → Infantile Spasms');
replace(epi, 'CHCO Inpatient RN Case Manager', 'Inpatient RN Case Manager', 'CHCO Inpatient RN → Inpatient RN');
replace(epi, 'CHCO RN Case Manager', 'RN Case Manager', 'CHCO RN Case Manager → RN Case Manager');
replace(epi, 'At CHCO, we recommend the very high dose prednisolone protocol', 'The recommended approach is the very high dose prednisolone protocol', 'At CHCO, we recommend → The recommended approach');
replace(epi, 'CHCO IS clinical pathway', 'Infantile Spasms clinical pathway', 'CHCO IS clinical pathway → IS clinical pathway');
saveJson(epi.path, epi.data);

// ── neurocritical-care.json ──
console.log('\nneurocritical-care.json:');
const nc = loadJson('neurocritical-care.json');
replace(nc,
  '<strong>Brain Death CHCO POLICY August 2013 *this is based on the non-published policy, so please confirm on MyChildrensColorado for published guidelines</strong>',
  '<strong>Brain Death Policy Guidelines</strong>',
  'Brain Death CHCO POLICY → Brain Death Policy Guidelines'
);
replace(nc, ' and on CHCO Intranet', '', 'Remove "and on CHCO Intranet"');
replace(nc, 'ICP management at CHCO', 'ICP management', 'Remove "at CHCO"');
replace(nc, ' or CHCO Intranet', '', 'Remove "or CHCO Intranet"');
// Also check for "CHCO" remaining
const ncRemaining = (nc.data.html.match(/CHCO/g) || []).length;
if (ncRemaining > 0) console.log(`  ⚠ ${ncRemaining} remaining CHCO mentions`);
saveJson(nc.path, nc.data);

// ── neuroimmunology.json ──
console.log('\nneuroimmunology.json:');
const ni = loadJson('neuroimmunology.json');
replace(ni, 'in CHCO lab', 'in the lab', 'in CHCO lab → in the lab');
saveJson(ni.path, ni.data);

// ── other-topics.json ──
console.log('\nother-topics.json:');
const ot = loadJson('other-topics.json');

// Remove SharePoint URL paragraphs using cheerio (safe DOM-based removal)
{
  const $ot = cheerio.load(ot.data.html, { decodeEntities: false });
  let spCount = 0;
  $ot('p').each(function () {
    const text = $ot(this).text().trim();
    if (/^From\s+<?\s*https:\/\/childrenscolorado/.test(text)) {
      $ot(this).remove();
      spCount++;
    }
  });
  if (spCount > 0) {
    ot.data.html = $ot('body').html() || ot.data.html;
    totalFixes += spCount;
    console.log(`  ✓ Removed ${spCount} SharePoint URL citations`);
  } else {
    console.log('  ✗ No SharePoint URLs found');
  }
}

// Replace Colorado-specific legislation reference
replace(ot,
  'Colorado Youth Concussion Act: includes children 11-18 years old involved in any organized sport (school or club)',
  'State Youth Concussion Laws: typically include children 11-18 years old involved in any organized sport (school or club)',
  'Colorado Youth Concussion Act → State Youth Concussion Laws'
);

// Replace Colorado altitude reference
replace(ot,
  'In Colorado, there is about 1.5 mSv more per year than living at sea level.',
  'At higher elevations (e.g. Denver, ~5,280 ft), there is about 1.5 mSv more per year than living at sea level.',
  'In Colorado → At higher elevations'
);

saveJson(ot.path, ot.data);

// ── pediatric-normal-values.json ──
console.log('\npediatric-normal-values.json:');
const pnv = loadJson('pediatric-normal-values.json');
{
  const $pnv = cheerio.load(pnv.data.html, { decodeEntities: false });
  let pnvSpCount = 0;
  $pnv('p').each(function () {
    const text = $pnv(this).text().trim();
    if (/^From\s+<?\s*https:\/\/childrenscolorado/.test(text)) {
      $pnv(this).remove();
      pnvSpCount++;
    }
  });
  if (pnvSpCount > 0) {
    pnv.data.html = $pnv('body').html() || pnv.data.html;
    totalFixes += pnvSpCount;
    console.log(`  ✓ Removed ${pnvSpCount} SharePoint URL citations`);
  } else {
    console.log('  ✗ No SharePoint URLs found');
  }
}
saveJson(pnv.path, pnv.data);

// ── search.json ── (mirror the same fixes)
console.log('\nsearch.json:');
const searchPath = path.join(DATA_DIR, 'search.json');
let searchData = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));
let searchStr = JSON.stringify(searchData);
const searchOrigLen = searchStr.length;

// Apply same text replacements
searchStr = searchStr.replace(/CHCO Infantile Spasms Clinical Pathway/g, 'Infantile Spasms Clinical Pathway');
searchStr = searchStr.replace(/CHCO Inpatient RN Case Manager/g, 'Inpatient RN Case Manager');
searchStr = searchStr.replace(/CHCO RN Case Manager/g, 'RN Case Manager');
searchStr = searchStr.replace(/At CHCO, we recommend the very high dose prednisolone protocol/g, 'The recommended approach is the very high dose prednisolone protocol');
searchStr = searchStr.replace(/CHCO IS clinical pathway/g, 'Infantile Spasms clinical pathway');
searchStr = searchStr.replace(/Brain Death CHCO POLICY August 2013[^"]*MyChildrensColorado for published guidelines/g, 'Brain Death Policy Guidelines');
searchStr = searchStr.replace(/ and on CHCO Intranet/g, '');
searchStr = searchStr.replace(/ICP management at CHCO/g, 'ICP management');
searchStr = searchStr.replace(/ or CHCO Intranet/g, '');
searchStr = searchStr.replace(/in CHCO lab/g, 'in the lab');
searchStr = searchStr.replace(/Colorado Youth Concussion Act: includes/g, 'State Youth Concussion Laws: typically include');
searchStr = searchStr.replace(/In Colorado, there is about/g, 'At higher elevations (e.g. Denver, ~5,280 ft), there is about');

if (searchStr.length !== searchOrigLen) {
  searchData = JSON.parse(searchStr);
  fs.writeFileSync(searchPath, JSON.stringify(searchData, null, 2), 'utf-8');
  // Also update public copy
  const publicSearchPath = path.join(ROOT, 'public', 'search.json');
  if (fs.existsSync(publicSearchPath)) {
    fs.writeFileSync(publicSearchPath, JSON.stringify(searchData, null, 2), 'utf-8');
    console.log('  ✓ Updated search.json and public/search.json');
  } else {
    console.log('  ✓ Updated search.json');
  }
} else {
  console.log('  No changes needed');
}

// ── Final verification ──
console.log(`\n── Summary: ${totalFixes} total fixes ──`);

// Check for any remaining CHCO/Colorado/MyChildrens in all files
console.log('\nRemaining mentions scan:');
const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
for (const f of files) {
  const content = fs.readFileSync(path.join(DATA_DIR, f), 'utf-8');
  const chcoCount = (content.match(/CHCO/gi) || []).length;
  const coloradoCount = (content.match(/colorado/gi) || []).length;
  const myChildrensCount = (content.match(/MyChildrens/gi) || []).length;
  if (chcoCount + coloradoCount + myChildrensCount > 0) {
    console.log(`  ${f}: CHCO=${chcoCount}, Colorado=${coloradoCount}, MyChildrens=${myChildrensCount}`);
  }
}
