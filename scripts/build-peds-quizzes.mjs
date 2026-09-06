// Build src/data/peds-quizzes.json from the supplied markdown source.
//
// Source: four 50-question quizzes drawn from the Nelson Textbook of Pediatrics
// 17th ed. self-assessment sets, aimed at the PGY1-2 pediatrics years. Each
// quiz is deliberately mixed ~30% neurology / 20% genetics-metabolism / 50%
// general pediatrics, which is why the topic-mix line is carried through to
// the data and shown in the UI.
//
// The 17th edition is from 2004. The supplied answer keys are the source's own,
// with current-practice notes written into the explanations where the original
// key has since been superseded. Those notes are preserved verbatim — do not
// "correct" them out.
//
// Usage: node scripts/build-peds-quizzes.mjs [path-to-source.md]
//   Defaults to scripts/sources/peds-practice-quizzes.md

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const src = process.argv[2] ?? resolve(repo, 'scripts/sources/peds-practice-quizzes.md');
const out = resolve(repo, 'src/data/peds-quizzes.json');

const raw = readFileSync(src, 'utf8');
const lines = raw.split(/\r?\n/);

/** Split the file into per-quiz chunks on the `QUIZ n` banner. */
function splitQuizzes() {
  const marks = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^QUIZ (\d+)\s*$/.exec(lines[i]);
    if (m) marks.push({ quiz: Number(m[1]), start: i });
  }
  return marks.map((m, i) => ({
    quiz: m.quiz,
    body: lines.slice(m.start, i + 1 < marks.length ? marks[i + 1].start : lines.length),
  }));
}

/** Parse the QUESTIONS half: `N. stem` followed by `- A) option` lines. */
function parseQuestions(body) {
  const qStart = body.findIndex((l) => /^QUESTIONS\s*$/.test(l));
  const kStart = body.findIndex((l) => /^ANSWER KEY/.test(l));
  if (qStart < 0 || kStart < 0) throw new Error('missing QUESTIONS or ANSWER KEY marker');

  const out = [];
  let cur = null;
  for (const line of body.slice(qStart + 1, kStart)) {
    const q = /^(\d+)\.\s+(.*)$/.exec(line);
    const o = /^-\s+([A-Z])\)\s+(.*)$/.exec(line);
    if (q) {
      if (cur) out.push(cur);
      cur = { num: Number(q[1]), stem: q[2].trim(), options: [] };
    } else if (o && cur) {
      cur.options.push({ letter: o[1], text: o[2].trim() });
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Parse the answer key: `N. LETTER. explanation`. */
function parseKey(body) {
  const kStart = body.findIndex((l) => /^ANSWER KEY/.test(l));
  const key = new Map();
  for (const line of body.slice(kStart + 1)) {
    const m = /^(\d+)\.\s+([A-Z])\.\s+(.*)$/.exec(line);
    if (m) key.set(Number(m[1]), { answer: m[2], explanation: m[3].trim() });
  }
  return key;
}

const quizzes = splitQuizzes().map(({ quiz, body }) => {
  const topicLine = body.find((l) => /^Topic mix:/.test(l)) ?? '';
  const topicMix = topicLine.replace(/^Topic mix:\s*/, '').trim();
  const questions = parseQuestions(body);
  const key = parseKey(body);

  const merged = questions.map((q) => {
    const k = key.get(q.num);
    if (!k) throw new Error(`quiz ${quiz} q${q.num}: no answer key entry`);
    if (!q.options.some((o) => o.letter === k.answer)) {
      throw new Error(`quiz ${quiz} q${q.num}: key letter ${k.answer} not among options`);
    }
    return {
      id: `peds-q${quiz}-${q.num}`,
      quiz,
      num: q.num,
      stem: q.stem,
      options: q.options,
      answer: k.answer,
      explanation: k.explanation,
    };
  });

  if (merged.length !== 50) throw new Error(`quiz ${quiz}: got ${merged.length} questions, want 50`);
  return { quiz, topicMix, questions: merged };
});

if (quizzes.length !== 4) throw new Error(`got ${quizzes.length} quizzes, want 4`);

const data = {
  source:
    'Nelson Textbook of Pediatrics, 17th ed. self-assessment sets. Answer keys are the ' +
    "source's own; explanations carry current-practice notes where the original key has " +
    'been superseded.',
  quizzes,
};

writeFileSync(out, JSON.stringify(data, null, 1) + '\n');

const total = quizzes.reduce((s, q) => s + q.questions.length, 0);
console.log(`wrote ${out}`);
console.log(`  ${quizzes.length} quizzes, ${total} questions`);
for (const q of quizzes) console.log(`  quiz ${q.quiz}: ${q.questions.length} — ${q.topicMix}`);
