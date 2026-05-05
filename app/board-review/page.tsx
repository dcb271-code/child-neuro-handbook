import questionsData from '@/src/data/board-review.json';
import BoardReviewApp from '@/components/board-review/BoardReviewApp';
import type { Question } from '@/lib/board-review/types';

export const dynamic = 'force-static';

export default function BoardReviewPage() {
  const questions = questionsData as Question[];
  return <BoardReviewApp questions={questions} />;
}
