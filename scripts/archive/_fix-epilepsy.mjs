/**
 * Fix epilepsy section:
 * 1. Fix Cannabidiol row typos in first (side-effects) table
 * 2. Move DOSES and FORMULATIONS chart to top of section
 * 3. Add visual separators to Lamotrigine row in DOSES table
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(path.resolve(__dirname, '..'), 'src', 'data', 'epilepsy.json');
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
let html = data.html;

// ── 1. Fix Cannabidiol row ──
const oldCbdRow = `<tr><td><p><strong>Cannabidiol (Epidiolex)</strong></p><p><strong>2018</strong></p></td><td><p>Anemia, infection tzars as zzz Greta  Fed zd</p></td><td><p>Sedation, diarrheal</p></td><td></td></tr>`;
const newCbdRow = `<tr><td><p><strong>Cannabidiol (Epidiolex)</strong></p><p><strong>2018</strong></p></td><td><p>Anemia, infection, GI upset</p></td><td><p>Sedation, diarrhea, liver toxicity</p></td><td><p>Medication interactions (e.g., Clobazam)</p></td></tr>`;

if (html.includes(oldCbdRow)) {
  html = html.replace(oldCbdRow, newCbdRow);
  console.log('✓ Fixed Cannabidiol row typos');
} else {
  console.log('✗ Cannabidiol row not found (exact match failed)');
}

// ── 2. Move DOSES and FORMULATIONS chart to top of section ──
// The chart = title paragraph + table-wrap div
const dosesTitle = '<p><strong>Antiseizure medication DOSES and FORMULATIONS for long term management </strong></p>';
const dosesTitleIdx = html.indexOf(dosesTitle);

if (dosesTitleIdx >= 0) {
  // Find the table-wrap that follows it
  const tableWrapStart = html.indexOf('<div class="table-wrap">', dosesTitleIdx);
  const tableEnd = html.indexOf('</table>', tableWrapStart);
  const tableWrapEnd = html.indexOf('</div>', tableEnd) + '</div>'.length;

  // Extract the full block (title + table)
  const dosesBlock = html.substring(dosesTitleIdx, tableWrapEnd);

  // Remove from current position
  html = html.substring(0, dosesTitleIdx) + html.substring(tableWrapEnd);

  // Insert at the very top of the section (before the first h1)
  html = dosesBlock + '\n' + html;

  console.log('✓ Moved DOSES and FORMULATIONS chart to top of section');
} else {
  console.log('✗ DOSES title not found');
}

// ── 3. Fix Lamotrigine row — add horizontal rule separators between 4 dosing sections ──
// In column 1 (Medication): add <hr> separators between the 4 strategy labels
const oldLamCol1 = `<td><p><strong>Lamotrigine (Lamictal)</strong></p><p>4-20 total/1-9 free</p><p><strong>WITH INDUCERS (carbamazepine, phenytoin, phenobarbital, primidone) and WITHOUT VPA</strong></p><p><strong>WITH INDUCERS (carbamazepine, phenytoin, phenobarbital, primidone) and WITH VPA</strong></p><p><strong>WITH VPA and WITHOUT INDUCERS</strong></p><p><strong>MONOTHERAPY or with antiseizure drugs other than carbamazepine, phenytoin, phenobarbital, primidone, or VPA</strong></p><p><strong>NOTE: Lamotrigine dosing recommendations vary widely, consider discussing with an attending.</strong></p></td>`;

const newLamCol1 = `<td><p><strong>Lamotrigine (Lamictal)</strong></p><p>4-20 total/1-9 free</p><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p><strong>WITH INDUCERS (carbamazepine, phenytoin, phenobarbital, primidone) and WITHOUT VPA</strong></p><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p><strong>WITH INDUCERS (carbamazepine, phenytoin, phenobarbital, primidone) and WITH VPA</strong></p><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p><strong>WITH VPA and WITHOUT INDUCERS</strong></p><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p><strong>MONOTHERAPY or with antiseizure drugs other than carbamazepine, phenytoin, phenobarbital, primidone, or VPA</strong></p><hr style="border:none;border-top:1px dashed #94a3b8;margin:8px 0;"><p><strong>NOTE: Lamotrigine dosing recommendations vary widely, consider discussing with an attending.</strong></p></td>`;

if (html.includes(oldLamCol1)) {
  html = html.replace(oldLamCol1, newLamCol1);
  console.log('✓ Added separators to Lamotrigine column 1');
} else {
  console.log('✗ Lamotrigine col 1 not found');
}

// Column 2 (Titration): add hr between each set of 4 lines (Week 1-2, Week 3-4, Then increase, Typical maintenance)
const oldLamCol2 = `<td><p> <br>Week 1-2</p><p>Week 3-4</p><p>Then increase</p><p>Typical maintenance</p><p>Week 1-2</p><p>Week 3-4</p><p>Then increase</p><p>Typical maintenance</p><p>Week 1-2</p><p>Week 3-4   </p><p>Then increase</p><p>Typical maintenance</p><p>Week 1-2</p><p>Week 3-4  </p><p>Then increase</p><p>Typical maintenance</p></td>`;

const newLamCol2 = `<td><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p>Week 1-2</p><p>Week 3-4</p><p>Then increase</p><p>Typical maintenance</p><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p>Week 1-2</p><p>Week 3-4</p><p>Then increase</p><p>Typical maintenance</p><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p>Week 1-2</p><p>Week 3-4</p><p>Then increase</p><p>Typical maintenance</p><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p>Week 1-2</p><p>Week 3-4</p><p>Then increase</p><p>Typical maintenance</p></td>`;

if (html.includes(oldLamCol2)) {
  html = html.replace(oldLamCol2, newLamCol2);
  console.log('✓ Added separators to Lamotrigine column 2 (Titration)');
} else {
  console.log('✗ Lamotrigine col 2 not found');
}

// Column 3 (Ped Dosing): add hr between each age-group section
const oldLamCol3 = `<td><p><strong>2yo-less than 16yo</strong></p><p>0.6-2 mg/kg/DAY div BID<br><br>&nbsp;</p><p>1.2-5 mg/kg/DAY div BID</p><p>1.2-5 mg/kg/DAY div BID q2wks</p><p>5-15 mg/kg/DAY div BID or TID (max 400 mg/DAY)</p><p><strong>2yo-less than 16yo</strong></p><p>0.2 mg/kg/DAY daily or div BID</p><p>0.5 mg/kg/DAY div BID</p><p>1 mg/kg/DAY q1-2 wks</p><p>5 mg/kg/DAY div BID (max 250 mg/DAY)</p><p><br><strong>2yo-less than 16yo</strong></p><p>0.1-0.2 mg/kg/DAY daily</p><p>0.2-0.5 mg/kg/DAY daily</p><p>0.3-1 mg/kg/DAY q1-2 wks</p><p>1-3 mg/kg/DAY daily or div BID (max 150-200 mg/DAY)</p><p><strong>2yo-less than 16yo</strong></p><p>0.3 mg/kg/DAY daily or div BID</p><p>0.6 mg/kg/DAY div BID</p><p>0.6 mg/kg/DAY q1-2 wks</p><p>4.5-7.5mg/kg/DAY div BID (max 300 mg/DAY)</p><p>Note: can use levels to adjust further</p></td>`;

const newLamCol3 = `<td><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p><strong>2yo-less than 16yo</strong></p><p>0.6-2 mg/kg/DAY div BID</p><p>1.2-5 mg/kg/DAY div BID</p><p>1.2-5 mg/kg/DAY div BID q2wks</p><p>5-15 mg/kg/DAY div BID or TID (max 400 mg/DAY)</p><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p><strong>2yo-less than 16yo</strong></p><p>0.2 mg/kg/DAY daily or div BID</p><p>0.5 mg/kg/DAY div BID</p><p>1 mg/kg/DAY q1-2 wks</p><p>5 mg/kg/DAY div BID (max 250 mg/DAY)</p><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p><strong>2yo-less than 16yo</strong></p><p>0.1-0.2 mg/kg/DAY daily</p><p>0.2-0.5 mg/kg/DAY daily</p><p>0.3-1 mg/kg/DAY q1-2 wks</p><p>1-3 mg/kg/DAY daily or div BID (max 150-200 mg/DAY)</p><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p><strong>2yo-less than 16yo</strong></p><p>0.3 mg/kg/DAY daily or div BID</p><p>0.6 mg/kg/DAY div BID</p><p>0.6 mg/kg/DAY q1-2 wks</p><p>4.5-7.5mg/kg/DAY div BID (max 300 mg/DAY)</p><p>Note: can use levels to adjust further</p></td>`;

if (html.includes(oldLamCol3)) {
  html = html.replace(oldLamCol3, newLamCol3);
  console.log('✓ Added separators to Lamotrigine column 3 (Ped Dosing)');
} else {
  console.log('✗ Lamotrigine col 3 not found');
}

// Column 4 (Adult Dose): add hr between each age-group section
const oldLamCol4 = `<td><p><strong>16yo and older</strong></p><p>50 mg q24h</p><p>50 mg q12h</p><p>100 mg/DAY q2wks</p><p>300-500 mg/DAY div BID or 400-600 mg daily [ER]</p><p><strong>16yo and older</strong></p><p>25 mg q48h</p><p>25 mg q24h</p><p>25-50 mg/DAY q1-2 wks (can div BID)</p><p>100-150 mg/DAY div BID</p><p><strong>16yo and older</strong></p><p>12.5-25 mg q48h</p><p>25 mg daily</p><p>25-50 mg/DAY q1-2wks</p><p>100-200 mg div BID or in 200-250mg daily [ER]</p><p><strong>16yo and older</strong></p><p>25 mg q24h</p><p>50 mg q24h or div BID</p><p>50 mg/DAY q1-2wks</p><p>225-375 mg/DAY div BID or 300-400 mg daily [ER]</p></td>`;

const newLamCol4 = `<td><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p><strong>16yo and older</strong></p><p>50 mg q24h</p><p>50 mg q12h</p><p>100 mg/DAY q2wks</p><p>300-500 mg/DAY div BID or 400-600 mg daily [ER]</p><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p><strong>16yo and older</strong></p><p>25 mg q48h</p><p>25 mg q24h</p><p>25-50 mg/DAY q1-2 wks (can div BID)</p><p>100-150 mg/DAY div BID</p><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p><strong>16yo and older</strong></p><p>12.5-25 mg q48h</p><p>25 mg daily</p><p>25-50 mg/DAY q1-2wks</p><p>100-200 mg div BID or in 200-250mg daily [ER]</p><hr style="border:none;border-top:2px solid #7c3aed;margin:8px 0;"><p><strong>16yo and older</strong></p><p>25 mg q24h</p><p>50 mg q24h or div BID</p><p>50 mg/DAY q1-2wks</p><p>225-375 mg/DAY div BID or 300-400 mg daily [ER]</p></td>`;

if (html.includes(oldLamCol4)) {
  html = html.replace(oldLamCol4, newLamCol4);
  console.log('✓ Added separators to Lamotrigine column 4 (Adult Dose)');
} else {
  console.log('✗ Lamotrigine col 4 not found');
}

// ── Save ──
data.html = html;
fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
console.log('\n✓ Saved epilepsy.json');
