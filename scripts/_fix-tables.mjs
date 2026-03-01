/**
 * Fix table column widths for:
 * 1. Epilepsy ASM table (5 cols: Medication, Titration, Ped Dosing, Adult Dose, Formulations)
 * 2. Movement-disorders Dystonia table (6 cols: Medication, Titration, Peds Dosing, Dosage Forms, Side Effects, MISC)
 *
 * Adds <colgroup> to give Titration columns proper width and reduce Medication column width.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

// ── Fix epilepsy ASM table ──
const epiPath = path.join(DATA_DIR, 'epilepsy.json');
const epi = JSON.parse(fs.readFileSync(epiPath, 'utf-8'));

// Find the table with "Titration" header - identify by the header row pattern
const epiTitIdx = epi.html.indexOf('<strong>Titration</strong>');
if (epiTitIdx >= 0) {
  const epiTableStart = epi.html.lastIndexOf('<table>', epiTitIdx);
  // Insert colgroup right after <table>
  const colgroup = `<colgroup><col style="width:15%"><col style="width:25%"><col style="width:25%"><col style="width:20%"><col style="width:15%"></colgroup>`;
  const insertPos = epiTableStart + '<table>'.length;
  // Check if colgroup already exists
  if (!epi.html.substring(insertPos, insertPos + 30).includes('<colgroup>')) {
    epi.html = epi.html.substring(0, insertPos) + colgroup + epi.html.substring(insertPos);
    console.log('✓ Added colgroup to epilepsy ASM table');
  } else {
    console.log('  Epilepsy ASM table already has colgroup');
  }
} else {
  console.log('✗ Epilepsy ASM table not found');
}

fs.writeFileSync(epiPath, JSON.stringify(epi, null, 2), 'utf-8');

// ── Fix movement-disorders Dystonia table ──
const mdPath = path.join(DATA_DIR, 'movement-disorders.json');
const md = JSON.parse(fs.readFileSync(mdPath, 'utf-8'));

// Find the table with <em>Titration</em> header
const mdTitIdx = md.html.indexOf('<em>Titration</em>');
if (mdTitIdx >= 0) {
  const mdTableStart = md.html.lastIndexOf('<table>', mdTitIdx);
  // 6 columns: Medication, Titration, Peds Dosing, Dosage Forms, Side Effects, MISC
  const colgroup = `<colgroup><col style="width:12%"><col style="width:22%"><col style="width:18%"><col style="width:15%"><col style="width:18%"><col style="width:15%"></colgroup>`;
  const insertPos = mdTableStart + '<table>'.length;
  if (!md.html.substring(insertPos, insertPos + 30).includes('<colgroup>')) {
    md.html = md.html.substring(0, insertPos) + colgroup + md.html.substring(insertPos);
    console.log('✓ Added colgroup to movement-disorders Dystonia table');
  } else {
    console.log('  Movement-disorders Dystonia table already has colgroup');
  }
} else {
  console.log('✗ Movement-disorders Dystonia table not found');
}

fs.writeFileSync(mdPath, JSON.stringify(md, null, 2), 'utf-8');
console.log('\n✓ Saved both files');
