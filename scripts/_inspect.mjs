// Temporary inspection script
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('C:/Users/dylan/child-neuro-handbook/src/data/neuro-on-call.json','utf-8'));
const html = data.html;

// Find all img src in order
const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
let match;
let i = 0;
while ((match = imgRegex.exec(html)) !== null) {
  i++;
  const pos = match.index;
  // Find closest preceding h2
  const before = html.substring(Math.max(0, pos-3000), pos);
  const h2matches = [...before.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  const lastH2 = h2matches.length ? h2matches[h2matches.length-1][1].replace(/<[^>]+>/g, '').trim() : 'none';
  // Find alt text
  const altMatch = match[0].match(/alt="([^"]*)"/);
  const alt = altMatch ? altMatch[1] : '';
  console.log(`${i}. ${match[1]}`);
  console.log(`   alt="${alt}"`);
  console.log(`   under h2: ${lastH2.substring(0, 80)}`);
  console.log();
}

// Find Clinical Reference Images section position
const clinRefIdx = html.indexOf('clinical-reference-images');
console.log('--- Clinical Reference Images section starts at char:', clinRefIdx);
console.log('--- Total HTML length:', html.length);

// Show the Diastat h3
const diastatIdx = html.indexOf('Diastat');
if (diastatIdx >= 0) {
  console.log('\n--- Diastat section context (200 chars):');
  console.log(html.substring(diastatIdx - 100, diastatIdx + 200));
}

// Show neonatal seizures context
const neonatalIdx = html.indexOf('neonatal-seizures');
if (neonatalIdx >= 0) {
  console.log('\n--- Neonatal seizures context (200 chars):');
  console.log(html.substring(neonatalIdx - 100, neonatalIdx + 200));
}
