import fs from 'fs';
import path from 'path';

const fp = 'src/data/epilepsy.json';
const imgDir = 'public/images/epilepsy';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// ── Image inventory with descriptions and target placement ──
// Target sections (by heading id):
//   PRE-BRIDGING (above bridging heading): asm-mechanisms, se-*, neonatal-*, home-seizure-rescue, diastat, valtoco, nayzilam
//   POST-BRIDGING: ketogenic-diet, vagus-nerve-stimulator-vns, infantile-spasms, seizure-basics,
//                  electroclincal-syndromes-by-age, epilepsy-associations-sudep,
//                  febrile-seizures, eeg-tips, valproic-acid-toxicity

const imageMap = [
  // PRE-BRIDGING images (img-2, img-15, img-14, img-16 are in the pre-bridging content — don't touch)

  // POST-BRIDGING images to place contextually:

  // === INFANTILE SPASMS ===
  { old: 'img-41.png', new: 'is-heterotopia-genes.png', section: 'infantile-spasms', after: 'follow-up-for-all-therapies', caption: 'Genes associated with subcortical band heterotopia and cortical malformations' },

  // === SEIZURE BASICS / SEMIOLOGY ===
  { old: 'img-24.png', new: 'seizure-tc-signs.png', section: 'seizure-basics', after: 'seizure-core-concepts', caption: 'Tonic-clonic seizure signs: sensitivity, specificity, and likelihood ratios' },
  { old: 'img-28.png', new: 'seizure-spread-diagram.png', section: 'seizure-basics', after: 'seizure-core-concepts', caption: 'Seizure spread: focal onset with secondary generalization vs primary generalized' },
  { old: 'img-29.png', new: 'seizure-semiology-by-region.png', section: 'seizure-basics', after: 'seizure-core-concepts', caption: 'Seizure semiology by cortical region' },
  { old: 'img-30.png', new: 'seizure-lateralizing-signs.png', section: 'seizure-basics', after: 'seizure-core-concepts', caption: 'Lateralizing seizure phenomena and hemisphere of onset' },
  { old: 'img-31.png', new: 'seizure-semiology-localization.png', section: 'seizure-basics', after: 'seizure-core-concepts', caption: 'Value and limitations of seizure semiology in localization' },
  { old: 'img-32.png', new: 'seizure-types-zones.png', section: 'seizure-basics', after: 'seizure-core-concepts', caption: 'Seizure types mapped to symptomatogenic zones and lateralization' },
  { old: 'img-25.gif', new: 'seizure-provoked-labs.gif', section: 'seizure-basics', after: 'seizure-core-concepts', caption: 'Lab value abnormalities commonly associated with provoked seizures' },
  { old: 'img-23.png', new: 'ilae-2017-expanded.png', section: 'seizure-basics', after: '2017-seizure-classification', caption: 'ILAE 2017 Classification of Seizure Types (Expanded Version)' },
  { old: 'img-26.png', new: 'ilae-2017-basic.png', section: 'seizure-basics', after: '2017-seizure-classification', caption: 'ILAE 2017 Classification of Seizure Types (Basic Version)' },
  { old: 'img-27.png', new: 'ilae-2017-detailed.png', section: 'seizure-basics', after: '2017-seizure-classification', caption: 'ILAE 2017 Seizure Types with motor and non-motor subtypes' },

  // === ELECTROCLINICAL SYNDROMES ===
  { old: 'img-33.png', new: 'electroclinical-syndromes-chart.png', section: 'electroclincal-syndromes-by-age', after: 'electroclincal-syndromes-by-age', caption: 'Electroclinical syndromes organized by age of onset' },

  // === NEUROANATOMY (placed under electroclinical/associations) ===
  { old: 'img-35.png', new: 'papez-circuit-block.png', section: 'epilepsy-associations-sudep', after: 'epilepsy-associations-sudep', caption: 'Papez Circuit block diagram' },
  { old: 'img-34.png', new: 'papez-circuit-anatomy.png', section: 'epilepsy-associations-sudep', after: 'epilepsy-associations-sudep', caption: 'Papez Circuit sagittal brain anatomy' },
  { old: 'img-36.png', new: 'hippocampal-anatomy.png', section: 'epilepsy-associations-sudep', after: 'epilepsy-associations-sudep', caption: 'Hippocampal anatomy cross-section (CA1-CA4, dentate gyrus)' },
  { old: 'img-37.png', new: 'medial-temporal-anatomy.png', section: 'epilepsy-associations-sudep', after: 'epilepsy-associations-sudep', caption: 'Medial temporal lobe and hippocampal structures' },

  // === STATUS EPILEPTICUS INFUSION PROTOCOLS ===
  // These belong in the SE section which is PRE-bridging — place after the last SE table
  { old: 'img-9.png', new: 'se-midazolam-infusion.png', section: 'pre-bridging-se', after: 'se-second-line', caption: 'Midazolam continuous infusion protocol for refractory SE' },
  { old: 'img-10.png', new: 'se-pentobarbital-infusion.png', section: 'pre-bridging-se', after: 'se-second-line', caption: 'Pentobarbital continuous infusion protocol for refractory SE' },
  { old: 'img-11.png', new: 'se-propofol-infusion.png', section: 'pre-bridging-se', after: 'se-second-line', caption: 'Propofol continuous infusion protocol for refractory SE' },
  { old: 'img-12.png', new: 'se-ketamine-infusion.png', section: 'pre-bridging-se', after: 'se-second-line', caption: 'Ketamine continuous infusion protocol for refractory SE' },

  // === EEG SECTION ===
  { old: 'img-42.png', new: 'eeg-1020-electrode-map.png', section: 'eeg', after: 'eeg-tips', caption: 'International 10-20 EEG electrode placement system' },
  { old: 'img-43.png', new: 'eeg-electrode-regions.png', section: 'eeg', after: 'eeg-tips', caption: 'Brain regions corresponding to EEG electrode positions' },
  { old: 'img-44.png', new: 'eeg-rhythms-table.png', section: 'eeg', after: 'eeg-tips', caption: 'EEG frequency bands: alpha, beta, theta, delta' },
  { old: 'img-45.png', new: 'eeg-abnormal-activity.png', section: 'eeg', after: 'eeg-tips', caption: 'Abnormal EEG activity: epileptiform and non-epileptiform patterns' },
  { old: 'img-46.png', new: 'eeg-events-definitions.png', section: 'eeg', after: 'eeg-tips', caption: 'EEG waveform terminology: spikes, sharp waves, complexes' },
  { old: 'img-47.png', new: 'eeg-sleep-stages.png', section: 'eeg', after: 'eeg-tips', caption: 'EEG features by sleep stage' },
  { old: 'img-48.png', new: 'eeg-sleep-rhythms.png', section: 'eeg', after: 'eeg-tips', caption: 'Sleep-related EEG components: vertex waves, spindles, K-complexes, POSTS' },
  { old: 'img-49.png', new: 'eeg-photic-responses.png', section: 'eeg', after: 'eeg-tips', caption: 'Photic stimulation EEG responses' },
  { old: 'img-18.png', new: 'eeg-1020-montage-freqs.png', section: 'eeg', after: 'eeg-tips', caption: '10-20 electrode montage with EEG frequency bands and age-dependent posterior dominant rhythm' },
  { old: 'img-19.gif', new: 'eeg-neonatal-development.gif', section: 'eeg', after: 'eeg-tips', caption: 'Normal EEG developmental patterns by conceptional age' },

  // === NEONATAL EEG ===
  { old: 'img-50.png', new: 'eeg-neonatal-patterns-by-age.png', section: 'eeg', after: 'eeg-tips', caption: 'Neonatal EEG patterns by conceptional age' },
  { old: 'img-51.png', new: 'eeg-neonatal-abnormalities.png', section: 'eeg', after: 'eeg-tips', caption: 'Neonatal EEG abnormalities: maturation, epileptiform, and background' },
];

// ── Step 1: Rename files on disk ──
console.log('Renaming image files...');
for (const img of imageMap) {
  const oldPath = path.join(imgDir, img.old);
  const newPath = path.join(imgDir, img.new);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`  ${img.old} → ${img.new}`);
  } else if (fs.existsSync(newPath)) {
    console.log(`  ${img.new} already exists (already renamed)`);
  } else {
    console.log(`  WARNING: ${img.old} not found!`);
  }
}

// ── Step 2: Update all src references in HTML ──
console.log('\nUpdating HTML references...');
for (const img of imageMap) {
  const oldSrc = `/images/epilepsy/${img.old}`;
  const newSrc = `/images/epilepsy/${img.new}`;
  if (h.includes(oldSrc)) {
    h = h.split(oldSrc).join(newSrc);
    console.log(`  Updated src: ${img.old} → ${img.new}`);
  }
}

// ── Step 3: Remove all post-bridging images from end and place contextually ──
// First, strip all post-bridging image blocks from the HTML
const bridgingH1 = '<h1 id="bridging-sick-kids-with-benzos">';
const bridgingIdx = h.indexOf(bridgingH1);

// Find all image tags after bridging
for (const img of imageMap) {
  const newSrc = `/images/epilepsy/${img.new}`;
  // Remove <p><img...></p> blocks
  const pImgRe = new RegExp(`<p><img[^>]*src="${newSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*></p>\\n*`, 'g');
  h = h.replace(pImgRe, '');
  // Remove bare <img> tags
  const bareRe = new RegExp(`<img[^>]*src="${newSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'g');
  h = h.replace(bareRe, '');
}

// ── Step 4: Insert images at their target locations ──
console.log('\nPlacing images contextually...');

// Group images by placement target
const placements = {};
for (const img of imageMap) {
  const key = img.section + '::' + img.after;
  if (!placements[key]) placements[key] = [];
  placements[key].push(img);
}

for (const [key, imgs] of Object.entries(placements)) {
  const [section, afterId] = key.split('::');

  // Build the image HTML block
  const imgHtml = imgs.map(img => {
    const src = `/images/epilepsy/${img.new}`;
    return `<p><img src="${src}" alt="${img.caption}" class="max-w-full rounded-lg my-4 mx-auto block"></p>`;
  }).join('\n');

  // Find insertion point based on the "after" heading id
  if (section === 'pre-bridging-se') {
    // SE infusion protocols go after the last SE second-line table (before bridging)
    // Find the end of the se-second-line section content
    const seIdx = h.indexOf('id="se-second-line"');
    if (seIdx > -1) {
      // Find the next h2 or h1 after this heading
      const afterSe = h.substring(seIdx);
      const nextHeading = afterSe.search(/<h[12][^>]*>/g);
      // Actually find the SECOND heading (skip the se-second-line heading itself)
      const firstClose = afterSe.indexOf('</h');
      const afterFirst = afterSe.substring(firstClose);
      const nextH = afterFirst.search(/<h[123][^>]*>/);
      if (nextH > -1) {
        const insertPos = seIdx + firstClose + nextH;
        h = h.substring(0, insertPos) + '\n' + imgHtml + '\n' + h.substring(insertPos);
        console.log(`  Placed ${imgs.length} SE infusion images after se-second-line`);
      }
    }
    continue;
  }

  // For post-bridging sections, find the heading and insert after its content block
  const headingId = `id="${afterId}"`;
  const headingIdx = h.lastIndexOf(headingId);
  if (headingIdx === -1) {
    console.log(`  WARNING: heading ${afterId} not found for ${imgs.length} images`);
    // Append at end as fallback
    h = h.trimEnd() + '\n' + imgHtml;
    continue;
  }

  // Find the next heading of same or higher level after this one
  const afterHeading = h.substring(headingIdx);
  const currentTag = afterHeading.match(/^id="[^"]*"[^>]*>/)?.[0];
  // Get the heading level
  const beforeId = h.substring(Math.max(0, headingIdx - 10), headingIdx);
  const levelMatch = beforeId.match(/<h(\d)/);
  const level = levelMatch ? parseInt(levelMatch[1]) : 1;

  // Find the next heading of same or higher level
  let nextHeadingPos = -1;
  const searchFrom = headingIdx + 50; // skip past current heading
  const remaining = h.substring(searchFrom);

  // Look for next h1 or same-level heading
  const nextSameOrHigher = remaining.search(new RegExp(`<h[1-${level}][^>]*>`));
  if (nextSameOrHigher > -1) {
    nextHeadingPos = searchFrom + nextSameOrHigher;
  }

  if (nextHeadingPos > -1) {
    h = h.substring(0, nextHeadingPos) + imgHtml + '\n' + h.substring(nextHeadingPos);
    console.log(`  Placed ${imgs.length} images before next heading after ${afterId}`);
  } else {
    // Append before end images or at end
    h = h.trimEnd() + '\n' + imgHtml;
    console.log(`  Placed ${imgs.length} images at end (no next heading found after ${afterId})`);
  }
}

// ── Step 5: Save ──
d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;

// Verify no duplicates
const allSrcs = h.match(/src="\/images\/epilepsy\/[^"]+"/g) || [];
const srcCounts = {};
allSrcs.forEach(s => srcCounts[s] = (srcCounts[s] || 0) + 1);
const dupes = Object.entries(srcCounts).filter(([, c]) => c > 1);
if (dupes.length) {
  console.log('\nWARNING: Duplicate images:');
  dupes.forEach(([s, c]) => console.log(`  ${s} x${c}`));
}

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log(`\nDone. Images: ${d.imageCount}, TOC: ${d.tocCount}`);
