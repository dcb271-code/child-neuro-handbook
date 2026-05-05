#!/usr/bin/env node
// Assigns each board-review question to one of N modules (default 7),
// balanced across dim1 categories. Algorithm: sort questions within each
// topic by id (deterministic), then round-robin into modules 1..N with a
// per-topic starting offset so leftovers spread evenly. Idempotent given
// the same input.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET = resolve(__dirname, '..', 'src', 'data', 'board-review.json');

const MODULE_COUNT = 7;

const data = JSON.parse(readFileSync(TARGET, 'utf8'));

const groups = new Map();
for (const q of data) {
  const cat = q.labels.dim1Category;
  if (!groups.has(cat)) groups.set(cat, []);
  groups.get(cat).push(q);
}

// Rotate starting module per topic so leftovers (when a topic count
// isn't divisible by MODULE_COUNT) don't all pile into modules 1, 2, 3.
let startOffset = 0;
const sortedTopics = [...groups.keys()].sort();
for (const cat of sortedTopics) {
  const list = groups.get(cat);
  list.sort((a, b) => a.id.localeCompare(b.id));
  list.forEach((q, i) => {
    q.module = (((i + startOffset) % MODULE_COUNT) + 1);
  });
  startOffset = (startOffset + list.length) % MODULE_COUNT;
}

writeFileSync(TARGET, JSON.stringify(data, null, 2) + '\n', 'utf8');

const counts = data.reduce((m, q) => ((m[q.module] = (m[q.module] || 0) + 1), m), {});
console.log('Module distribution (total):');
console.log(JSON.stringify(counts, null, 2));

console.log('\nPer-topic module distribution:');
const perTopic = {};
for (const q of data) {
  const cat = q.labels.dim1Category;
  if (!perTopic[cat]) {
    perTopic[cat] = {};
    for (let i = 1; i <= MODULE_COUNT; i++) perTopic[cat][i] = 0;
  }
  perTopic[cat][q.module]++;
}
for (const [cat, dist] of Object.entries(perTopic).sort((a, b) => a[0].localeCompare(b[0]))) {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  console.log(`  ${cat.padEnd(28)} ${JSON.stringify(dist)}  (n=${total})`);
}
