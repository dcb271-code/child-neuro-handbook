// The picked name, kept in a server-set cookie as well as localStorage.
//
// Why both: Safari deletes all of a site's script-writable storage —
// localStorage and JS-set cookies alike — after seven days of Safari use
// without visiting the site. A resident who picked their name in September
// and came back in October was silently anonymous, and the quizzes ran
// without recording anything. A cookie set by the server in a response
// header is not script-writable storage and survives. localStorage stays as
// the fast path; the cookie re-seeds it when it has been wiped.
//
// This is a plain name, not a credential: anyone could set it to anyone, the
// same as the localStorage value it mirrors. The *verified* identity (when a
// resident has set a password) is a separate signed, HttpOnly cookie — see
// lib/progress/identityAuth.ts — and nothing here is trusted for that.
//
// Pure helpers only: this file is imported from a client hook.

export const NAME_COOKIE = 'neuro-identity';

/** One year. Chrome caps cookie lifetime at 400 days; this is comfortably under. */
export const NAME_COOKIE_MAX_AGE_S = 365 * 24 * 60 * 60;

/** The name stored in a `document.cookie`-style string, or null. */
export function parseNameCookie(cookieString: string | null | undefined): string | null {
  if (!cookieString) return null;
  for (const part of cookieString.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== NAME_COOKIE) continue;
    const raw = part.slice(eq + 1).trim();
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return null;
    }
  }
  return null;
}
