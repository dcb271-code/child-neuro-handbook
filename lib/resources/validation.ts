export const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
] as const;

export const ALLOWED_SUBSECTIONS = ['conferences', 'lectures', 'misc'] as const;
export type Subsection = (typeof ALLOWED_SUBSECTIONS)[number];

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export function validateMime(mime: string): boolean {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

export function validateSize(bytes: number): boolean {
  return bytes >= 0 && bytes <= MAX_FILE_BYTES;
}

export function validateSubsection(s: string): s is Subsection {
  return (ALLOWED_SUBSECTIONS as readonly string[]).includes(s);
}

export function validateUrl(s: string): boolean {
  if (typeof s !== 'string') return false;
  if (/\s/.test(s)) return false; // any whitespace anywhere (incl. \r, \n, \t, leading/trailing)
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateShortString(s: string): boolean {
  if (typeof s !== 'string') return false;
  if (s.length === 0 || s.length > 200) return false;
  if (/[\r\n]/.test(s)) return false;
  // Check for Unicode line separator (U+2028) and paragraph separator (U+2029)
  const lineSeparator = String.fromCharCode(0x2028);
  const paragraphSeparator = String.fromCharCode(0x2029);
  if (s.includes(lineSeparator) || s.includes(paragraphSeparator)) return false;
  return true;
}
