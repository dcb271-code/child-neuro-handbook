import { describe, it, expect } from 'vitest';
import pedsData from '@/src/data/peds-quizzes.json';
import type { PedsQuizData } from '../types';
import { PEDS_CONFIG, pedsSets, pedsLocator, topicSummary } from '@/lib/quiz-runner/adapters';

const data = pedsData as PedsQuizData;
const all = data.quizzes.flatMap((z) => z.questions);

describe('peds-quizzes.json integrity', () => {
  it('has 4 quizzes of exactly 50 questions', () => {
    expect(data.quizzes).toHaveLength(4);
    for (const z of data.quizzes) expect(z.questions).toHaveLength(50);
  });

  it('has 200 questions in total, with unique ids', () => {
    expect(all).toHaveLength(200);
    expect(new Set(all.map((q) => q.id)).size).toBe(200);
  });

  it('gives every question a stem, options, an explanation, and a valid answer', () => {
    for (const q of all) {
      expect(q.stem.length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThan(0);
      expect(q.options.length).toBeGreaterThanOrEqual(4);
      expect(q.options.map((o) => o.letter)).toContain(q.answer);
      for (const o of q.options) expect(o.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('letters its options sequentially from A', () => {
    const alphabet = 'ABCDEFG';
    for (const q of all) {
      expect(q.options.map((o) => o.letter).join('')).toBe(alphabet.slice(0, q.options.length));
    }
  });

  it('numbers questions 1-50 within each quiz', () => {
    for (const z of data.quizzes) {
      expect(z.questions.map((q) => q.num)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    }
  });

  it('keeps the intended subject balance — about a third neurology', () => {
    // The topic-mix line is the source's own tally. Neurology subtopics are
    // prefixed "N-"; genetics and metabolism are "Gen" and "Metab".
    for (const z of data.quizzes) {
      const counts = new Map<string, number>();
      for (const part of z.topicMix.split(',')) {
        const m = /^\s*(\S+)\s+(\d+)\s*$/.exec(part);
        expect(m).not.toBeNull();
        counts.set(m![1], Number(m![2]));
      }
      const total = [...counts.values()].reduce((a, b) => a + b, 0);
      expect(total).toBe(50);

      const neuro = [...counts].filter(([k]) => k.startsWith('N-')).reduce((s, [, v]) => s + v, 0);
      const genMetab = (counts.get('Gen') ?? 0) + (counts.get('Metab') ?? 0);
      expect(neuro).toBe(15);      // 30%
      expect(genMetab).toBe(10);   // 20%
    }
  });

  it('does not park the correct answer on one letter', () => {
    const counts = new Map<string, number>();
    for (const q of all) counts.set(q.answer, (counts.get(q.answer) ?? 0) + 1);
    const overweight = [...counts].filter(([, n]) => n / all.length >= 0.35);
    expect(overweight).toEqual([]);
  });

  it('never lets the correct answer give itself away by length', () => {
    // Same cap the RITE bank is held to (see lib/rite/__tests__/scoring.test.ts).
    // This source arrived clean; the test keeps it that way.
    const offenders = all
      .map((q) => {
        const len = (l: string) => q.options.find((o) => o.letter === l)!.text.length;
        const longestWrong = Math.max(
          ...q.options.filter((o) => o.letter !== q.answer).map((o) => o.text.length),
        );
        return { id: q.id, gap: len(q.answer) - longestWrong };
      })
      .filter((x) => x.gap >= 40);
    expect(offenders).toEqual([]);
  });
});

describe('peds runner adapter', () => {
  it('exposes four sets of 50, numbered 1-4', () => {
    const sets = pedsSets(data);
    expect(sets.map((s) => s.number)).toEqual([1, 2, 3, 4]);
    for (const s of sets) expect(s.questions).toHaveLength(50);
  });

  it('shows no benchmark, since these have no published passing mark', () => {
    expect(PEDS_CONFIG.benchmarks).toBe(false);
    expect(PEDS_CONFIG.quizId).toBe('peds');
  });

  it('builds a locator naming the quiz and question number', () => {
    expect(pedsLocator(all[0], 1)).toBe('Quiz 1 · question 1');
  });

  it('credits the source edition', () => {
    expect(PEDS_CONFIG.source).toMatch(/Nelson/);
    expect(data.source).toMatch(/17th ed/);
  });
});

describe('topicSummary', () => {
  it('condenses the subtopic tally into the three design buckets', () => {
    expect(topicSummary(data.quizzes[0].topicMix)).toBe(
      '15 neuro · 10 genetics/metabolic · 25 general peds',
    );
  });

  it('summarises every quiz to the same 15/10/25 split', () => {
    for (const z of data.quizzes) {
      expect(topicSummary(z.topicMix)).toBe('15 neuro · 10 genetics/metabolic · 25 general peds');
    }
  });
});
