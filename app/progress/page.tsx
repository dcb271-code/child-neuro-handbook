import { readAttempts } from '@/lib/progress/store';
import { computeProgress } from '@/lib/progress/calculator';
import DailyChallenge from '@/components/DailyChallenge';
import QuizProgressSection from '@/components/progress/QuizProgressSection';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Progress — Child Neurology Handbook',
};

export default async function ProgressPage() {
  const attempts = await readAttempts();
  const board = computeProgress(attempts);

  return (
    <DailyChallenge>
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
          Progress
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Daily question and board review completion, self-tracked by residents who opt in.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-3 mb-4 text-xs text-slate-500 dark:text-slate-400">
        Tracking is opt-in and self-identified — pick your name on the{' '}
        <a href="/board-review/" className="text-indigo-600 dark:text-indigo-400 hover:underline">board review</a>{' '}
        or daily question screen to start showing up here. Anyone can pick any name; this is not a login.
      </div>

      <QuizProgressSection
        title="Daily Question"
        blurb="One attempt logged per day — the first question you see, whether right or wrong."
        progress={board.daily}
      />
      <QuizProgressSection
        title="Board Review"
        blurb="Every question answered in a session, across all sessions."
        progress={board['board-review']}
      />
    </div>
    </DailyChallenge>
  );
}
