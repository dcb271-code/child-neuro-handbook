// Pediatrics in-service practice quizzes, for the PGY1-2 pediatrics years
// before the child-neurology years.
//
// Four 50-question quizzes built from the Nelson Textbook of Pediatrics 17th
// ed. self-assessment sets. Each quiz is deliberately mixed — roughly 30%
// neurology, 20% genetics/metabolism, 50% general pediatrics — so the topic
// mix is carried per quiz and shown on the picker card.
//
// Regenerate with `node scripts/build-peds-quizzes.mjs`. Unlike the RITE set
// these questions carry no images and no sub-parts.

export type PedsOption = {
  letter: string; // 'A'–'G'; most items are A–E
  text: string;
};

export type PedsQuestion = {
  id: string;   // e.g. "peds-q2-17"
  quiz: number; // 1–4
  num: number;  // 1–50 within the quiz
  stem: string;
  options: PedsOption[];
  answer: string;
  explanation: string;
};

export type PedsQuiz = {
  quiz: number;
  /** Subtopic counts as supplied, e.g. "Derm 3, EM 3, Gen 3, ID 11, ...". */
  topicMix: string;
  questions: PedsQuestion[];
};

export type PedsQuizData = {
  source: string;
  quizzes: PedsQuiz[];
};
