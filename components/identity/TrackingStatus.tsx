'use client';

import { useIdentity } from '@/lib/identity/useIdentity';

/**
 * One line on the quiz screens saying whether this session will be recorded.
 *
 * Exists because a resident did ~150 questions believing they were tracked
 * while their picked name had been wiped (Safari purges localStorage after
 * seven days away). Nothing on the question screen said so, and the quiz ran
 * exactly as it always does. Now the state is visible where the work happens,
 * and the results screen says plainly when a session was not recorded.
 */
export default function TrackingStatus({
  context,
  className = '',
}: {
  context: 'question' | 'results';
  className?: string;
}) {
  const { name, loaded } = useIdentity();
  if (!loaded) return null;

  if (name) {
    if (context === 'results') return null; // the saved session speaks for itself
    return (
      <p className={`text-xs text-slate-500 dark:text-slate-400 ${className}`}>
        Recording as <span className="font-medium text-slate-700 dark:text-slate-200">{name}</span>
      </p>
    );
  }

  return (
    <p
      className={`text-xs rounded-md border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-3 py-2 ${className}`}
    >
      {context === 'results' ? (
        <>This session was <strong>not recorded</strong> — no name is selected. </>
      ) : (
        <>This session is <strong>not being recorded</strong> — no name is selected. </>
      )}
      Pick your name on the Board Review start screen to track progress.
    </p>
  );
}
