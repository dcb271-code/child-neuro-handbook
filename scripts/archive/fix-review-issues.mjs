/**
 * fix-review-issues.mjs
 * Fixes issues found during the resident-on-call review:
 *  1. Remove duplicate empty Dystonia heading in movement-disorders
 *  2. Remove duplicate empty Hemorrhagic Stroke heading in stroke
 *  3. Add VPA toxicity cross-reference in neuro-on-call
 *  4. Restructure ICP management as numbered protocol in neurocritical-care
 *  5. Restyle Vision Loss sections in neuro-ophthalmology
 *
 * Run: node scripts/fix-review-issues.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

function loadJson(name) {
  const p = path.join(DATA_DIR, name);
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function saveJson(name, data) {
  const p = path.join(DATA_DIR, name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

// ── 1. Movement Disorders: Remove duplicate empty Dystonia heading ────────────

console.log('\n1. Movement Disorders — fixing duplicate Dystonia...');
{
  const data = loadJson('movement-disorders.json');
  const $ = cheerio.load(data.html, { decodeEntities: false });

  // The first #dystonia heading is empty (no content before #dystonia-2)
  // Remove it and rename #dystonia-2 to #dystonia
  const h3first = $('h3#dystonia');
  const h3second = $('h3#dystonia-2');

  if (h3first.length && h3second.length) {
    // Check if first heading has no meaningful content between it and the second
    let hasContent = false;
    let el = h3first.next();
    while (el.length && !el.is('h3#dystonia-2')) {
      if (el.text().trim().length > 0) hasContent = true;
      el = el.next();
    }

    if (!hasContent) {
      h3first.remove();
      h3second.attr('id', 'dystonia');
      // Clean up the strong wrapper and trailing space
      const innerHtml = h3second.html();
      if (innerHtml) {
        h3second.html(innerHtml.replace(/<strong>\s*/g, '').replace(/\s*<\/strong>/g, '').trim());
      }
      console.log('  ✓ Removed empty first Dystonia heading, renamed dystonia-2 → dystonia');
    } else {
      // Both have content — rename the second one
      h3second.attr('id', 'dystonia-clinical-features');
      h3second.html('Dystonia: Clinical Features');
      console.log('  ✓ Renamed dystonia-2 → dystonia-clinical-features');
    }

    data.html = $('body').html() || data.html;

    // Fix TOC: remove or rename the duplicate
    data.toc = data.toc.filter(t => t.id !== 'dystonia-2');
    // Make sure there's still a dystonia entry
    const hasDystonia = data.toc.some(t => t.id === 'dystonia');
    if (!hasDystonia) {
      // Find where dystonia-2 was and add dystonia back
      const idx = data.toc.findIndex(t => t.text.toLowerCase().includes('chorea'));
      data.toc.splice(idx >= 0 ? idx : data.toc.length, 0,
        { level: 3, text: 'Dystonia', id: 'dystonia' }
      );
    }
  } else {
    console.log('  ✗ Could not find both Dystonia headings');
  }

  saveJson('movement-disorders.json', data);
}

// ── 2. Stroke: Remove duplicate empty Hemorrhagic Stroke heading ─────────────

console.log('\n2. Stroke — fixing duplicate Hemorrhagic Stroke...');
{
  const data = loadJson('stroke.json');
  const $ = cheerio.load(data.html, { decodeEntities: false });

  const h1first = $('h1#hemorrhagic-stroke');
  const h1second = $('h1#hemorrhagic-stroke-2');

  if (h1first.length && h1second.length) {
    // Check if first heading is empty (no content before the second)
    let hasContent = false;
    let el = h1first.next();
    while (el.length && !el.is('h1#hemorrhagic-stroke-2')) {
      if (el.text().trim().length > 0) hasContent = true;
      el = el.next();
    }

    if (!hasContent) {
      h1first.remove();
      h1second.attr('id', 'hemorrhagic-stroke');
      // Clean up formatting artifacts
      const innerHtml = h1second.html();
      if (innerHtml) {
        h1second.html(innerHtml
          .replace(/&nbsp;/g, '')
          .replace(/<strong>\s*<\/strong>/g, '')
          .trim() || 'Hemorrhagic Stroke');
      }
      console.log('  ✓ Removed empty first Hemorrhagic Stroke heading, renamed -2 → primary');
    } else {
      h1second.attr('id', 'hemorrhagic-stroke-workup');
      h1second.html('Hemorrhagic Stroke: Differential & Workup');
      console.log('  ✓ Renamed hemorrhagic-stroke-2 → hemorrhagic-stroke-workup');
    }

    data.html = $('body').html() || data.html;

    // Fix TOC
    data.toc = data.toc.filter(t => t.id !== 'hemorrhagic-stroke-2');
    const hasHS = data.toc.some(t => t.id === 'hemorrhagic-stroke');
    if (!hasHS) {
      data.toc.push({ level: 1, text: 'Hemorrhagic Stroke', id: 'hemorrhagic-stroke' });
    }
  } else {
    console.log('  ✗ Could not find both Hemorrhagic Stroke headings');
  }

  saveJson('stroke.json', data);
}

// ── 3. Neuro On-Call: Add VPA toxicity cross-reference ───────────────────────

console.log('\n3. Neuro On-Call — adding VPA toxicity cross-reference...');
{
  const data = loadJson('neuro-on-call.json');

  // Insert after the seizure medications section (before the Stroke section header)
  const vpaCrossRef = `
<div class="callout-box" style="border-color:#7c3aed40;background:rgba(124,58,237,0.05);">
<p><strong>VPA Toxicity?</strong> For valproic acid hyperammonemia, L-carnitine protocol, and overdose management, see <a href="/epilepsy/#valproic-acid-toxicity">VPA Toxicity Management</a> in the Epilepsy section.</p>
</div>`;

  // Find the stroke section header to insert before it
  const strokeH2 = '<h2 id="stroke"';
  if (data.html.includes(strokeH2)) {
    data.html = data.html.replace(strokeH2, vpaCrossRef + strokeH2);
    console.log('  ✓ Added VPA toxicity cross-reference after seizure meds section');
  } else {
    // Try alternate — insert before the third <section> or before stroke heading
    const strokeSection = '<section style="margin-top:2.5rem;border-top:3px solid #b45309';
    if (data.html.includes(strokeSection)) {
      data.html = data.html.replace(strokeSection, vpaCrossRef + strokeSection);
      console.log('  ✓ Added VPA toxicity cross-reference before Stroke section');
    } else {
      console.log('  ✗ Could not find insertion point');
    }
  }

  saveJson('neuro-on-call.json', data);
}

// ── 4. Neurocritical Care: Restructure ICP management ────────────────────────

console.log('\n4. Neurocritical Care — restructuring ICP management...');
{
  const data = loadJson('neurocritical-care.json');
  const $ = cheerio.load(data.html, { decodeEntities: false });

  const icpH1 = $('h1#icp-management');
  if (icpH1.length) {
    // Collect all elements between ICP heading and next h1
    const toRemove = [];
    let el = icpH1.next();
    while (el.length && !el.is('h1')) {
      toRemove.push(el);
      el = el.next();
    }

    // Remove old content
    toRemove.forEach(e => e.remove());

    // Replace heading text
    icpH1.html('ICP Management Protocol');

    // Insert new structured content
    const newContent = `
<div class="red-flag-box">
<p><strong>Elevated ICP:</strong> ICP &gt; 20-25 mmHg sustained for &gt; 10 minutes. Goal ICP &lt; 20 mmHg.</p>
<p><strong>Clinical signs:</strong> Headache, vomiting, vision changes, altered mental status, pupillary changes. <strong>Cushing's triad</strong> (hypertension + bradycardia + irregular breathing) is a <strong>LATE sign</strong> suggesting impending herniation.</p>
<p><strong>CPP = MAP − ICP</strong> (target age-appropriate CPP)</p>
</div>

<h2 id="icp-step-1">Step 1: Immediate Measures</h2>
<div class="protocol-box">
<ul>
<li><strong>Notify neurosurgery</strong> — NSGY typically aids in ICP management</li>
<li>Optimize <strong>sedation and pain control</strong></li>
<li><strong>Head of bed elevated to 30°</strong>, head and neck midline (optimize venous drainage)</li>
<li><strong>Hyperventilate</strong> to PaCO₂ <strong>32-35 mmHg</strong> (temporary bridge only — do not maintain)</li>
<li>If EVD/ICP drain present: <strong>unclamp, set at 15 mmHg</strong>, notify NSGY</li>
<li>See <strong>Pupillometry</strong> section for noninvasive ICP trending (NPI &lt; 3 = pathological)</li>
</ul>
</div>

<h2 id="icp-step-2">Step 2: First-Line — Hypertonic Saline</h2>
<div class="protocol-box">
<p><strong>3% Hypertonic Saline (HTS)</strong> — 0.5 mEq/mL Na⁺</p>
<ul>
<li><strong>Dose: 5 mL/kg IV bolus</strong> via peripheral IV or central line</li>
<li>May repeat if ICP remains elevated</li>
<li><strong>Hold if serum Na⁺ ≥ 165 mmol/L</strong></li>
<li>Monitor serum sodium every 4-6 hours</li>
</ul>
</div>

<h2 id="icp-step-3">Step 3: Second-Line — Mannitol</h2>
<div class="protocol-box">
<p><strong>Use if fluid overloaded or not responsive to HTS:</strong></p>
<ul>
<li><strong>Dose: Mannitol 0.5-1 g/kg IV bolus</strong></li>
<li><strong>Hold if serum osmolarity ≥ 340 mOsm/kg</strong></li>
<li>May repeat after 15 minutes if ICP remains elevated</li>
<li>Monitor serum osmolarity, electrolytes, and volume status</li>
</ul>
</div>

<h2 id="icp-step-4">Step 4: Refractory ICP</h2>
<div class="red-flag-box">
<p><strong>If ICP remains elevated despite Steps 1-3:</strong></p>
<ul>
<li><strong>Neuromuscular blockade</strong> (eliminates shivering, coughing, ventilator dyssynchrony)</li>
<li><strong>Deep sedation:</strong>
  <ul>
  <li>Ketamine + midazolam infusion, OR</li>
  <li><strong>Pentobarbital coma</strong> — titrate to burst suppression on cEEG</li>
  </ul>
</li>
<li><strong>Therapeutic hypothermia</strong> to 32-34°C</li>
<li><strong>Neurosurgical intervention:</strong> decompressive craniectomy, hemicraniectomy</li>
</ul>
</div>`;

    icpH1.after(newContent);
    data.html = $('body').html() || data.html;

    // Update TOC
    const icpIdx = data.toc.findIndex(t => t.id === 'icp-management');
    if (icpIdx >= 0) {
      // Insert sub-entries after ICP
      const newToc = [
        { level: 2, text: 'Step 1: Immediate Measures', id: 'icp-step-1' },
        { level: 2, text: 'Step 2: First-Line — Hypertonic Saline', id: 'icp-step-2' },
        { level: 2, text: 'Step 3: Second-Line — Mannitol', id: 'icp-step-3' },
        { level: 2, text: 'Step 4: Refractory ICP', id: 'icp-step-4' },
      ];
      data.toc.splice(icpIdx + 1, 0, ...newToc);
    }

    console.log('  ✓ Restructured ICP management as 4-step protocol with boxes');
  } else {
    console.log('  ✗ Could not find ICP management heading');
  }

  saveJson('neurocritical-care.json', data);
}

// ── 5. Neuro-Ophthalmology: Restyle Vision Loss sections ─────────────────────

console.log('\n5. Neuro-Ophthalmology — restyling Vision Loss sections...');
{
  const data = loadJson('neuro-ophthalmology.json');
  const $ = cheerio.load(data.html, { decodeEntities: false });

  // Restyle the first Vision Loss section — add structure
  const visionH2 = $('h2#vision-loss');
  if (visionH2.length) {
    // Find the <ul> right after it and wrap in a callout box
    const nextUl = visionH2.next('ul');
    if (nextUl.length) {
      const items = nextUl.html();
      nextUl.replaceWith(`<div class="callout-box"><p><strong>Key definitions for optic disc findings:</strong></p><ul>${items}</ul></div>`);
      console.log('  ✓ Wrapped Vision Loss definitions in callout box');
    }
  }

  // Restyle the Acute vs Progressive table — add header row styling
  const visionH2b = $('h2#vision-loss-2');
  if (visionH2b.length) {
    // The table uses <td> for headers instead of <th>. The first row contains bold text.
    // Add a note above the table for context
    const tableWrap = visionH2b.next('.table-wrap');
    if (tableWrap.length) {
      visionH2b.after('<p><strong>When evaluating vision loss, first determine whether the loss is acute or progressive — this narrows the differential significantly:</strong></p>');
      console.log('  ✓ Added context note before Acute vs Progressive table');
    }
  }

  data.html = $('body').html() || data.html;
  saveJson('neuro-ophthalmology.json', data);
}

// ── 6. Update search.json and index.json ─────────────────────────────────────

console.log('\n6. Updating search.json with new headings...');
{
  const searchPath = path.join(DATA_DIR, 'search.json');
  const searchData = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));

  // Remove old entries for renamed/removed headings
  const removedIds = new Set(['dystonia-2', 'hemorrhagic-stroke-2']);
  const filtered = searchData.filter(c => !removedIds.has(c.id));

  // Add new ICP step entries
  const ncData = loadJson('neurocritical-care.json');
  const $nc = cheerio.load(ncData.html, { decodeEntities: false });

  ['icp-step-1', 'icp-step-2', 'icp-step-3', 'icp-step-4'].forEach(id => {
    const heading = $nc(`#${id}`);
    if (!heading.length) return;

    let text = '';
    let el = heading.next();
    while (el.length && !el.is('h1, h2, h3')) {
      text += el.text().trim() + ' ';
      el = el.next();
    }

    filtered.push({
      section: 'neurocritical-care',
      sectionName: 'Neurocritical Care',
      heading: heading.text().trim(),
      id,
      text: text.trim().slice(0, 500),
    });
  });

  fs.writeFileSync(searchPath, JSON.stringify(filtered, null, 2), 'utf-8');
  const publicPath = path.join(ROOT, 'public', 'search.json');
  if (fs.existsSync(publicPath)) {
    fs.writeFileSync(publicPath, JSON.stringify(filtered, null, 2), 'utf-8');
  }
  console.log(`  ✓ Search index updated (${filtered.length} chunks)`);
}

// Update index.json tocCounts
console.log('\n7. Updating index.json counts...');
{
  const indexData = loadJson('index.json');
  for (const entry of indexData) {
    const sectionPath = path.join(DATA_DIR, `${entry.slug}.json`);
    if (!fs.existsSync(sectionPath)) continue;
    const sectionData = JSON.parse(fs.readFileSync(sectionPath, 'utf-8'));
    entry.tocCount = sectionData.toc.length;
  }
  saveJson('index.json', indexData);
  console.log('  ✓ index.json tocCounts updated');
}

console.log('\n── Done! ──\n');
