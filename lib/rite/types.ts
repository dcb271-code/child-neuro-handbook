// RITE practice exam data, extracted from the "Neurology Board and RITE
// Practice Examinations" document (10 exams x 40 numbered items).
//
// A handful of items carry a second part (e.g. 1.25b) that shares the parent's
// image and clinical stem. Those are separate answerable questions here, with
// `context` holding the parent stem, so each exam has 42-44 questions even
// though it has exactly 40 numbered items.

export type RiteOption = {
  letter: string; // 'A'–'E'
  text: string;
};

export type RiteQuestion = {
  id: string;      // e.g. "rite-e1-25b"
  exam: number;    // 1–10
  num: number;     // numbered item within the exam
  part: string;    // 'a' for the item itself, 'b'+ for sub-parts
  stem: string;
  /** Parent stem, present on sub-parts whose own stem says "this patient". */
  context?: string;
  options: RiteOption[];
  answer: string;  // correct option letter
  explanation: string;
  images?: string[];
  imageAlt?: string;
  salient?: string;
  learning?: string;
  note?: string;
};

export type RiteExam = {
  exam: number;
  questions: RiteQuestion[];
};

export type RiteData = {
  source: string;
  exams: RiteExam[];
};
