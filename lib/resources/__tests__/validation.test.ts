import { describe, it, expect } from 'vitest';
import {
  ALLOWED_MIME,
  ALLOWED_SUBSECTIONS,
  MAX_FILE_BYTES,
  validateMime,
  validateSize,
  validateSubsection,
  validateUrl,
  validateShortString,
} from '../validation';

describe('validateMime', () => {
  it('accepts every MIME in the allowlist', () => {
    for (const m of ALLOWED_MIME) {
      expect(validateMime(m)).toBe(true);
    }
  });
  it('rejects video, html, and unknown types', () => {
    expect(validateMime('video/mp4')).toBe(false);
    expect(validateMime('text/html')).toBe(false);
    expect(validateMime('application/octet-stream')).toBe(false);
    expect(validateMime('')).toBe(false);
  });
});

describe('validateSize', () => {
  it('accepts files at or below the limit', () => {
    expect(validateSize(0)).toBe(true);
    expect(validateSize(MAX_FILE_BYTES)).toBe(true);
  });
  it('rejects files over the limit', () => {
    expect(validateSize(MAX_FILE_BYTES + 1)).toBe(false);
  });
});

describe('validateSubsection', () => {
  it('accepts each known subsection', () => {
    for (const s of ALLOWED_SUBSECTIONS) {
      expect(validateSubsection(s)).toBe(true);
    }
  });
  it('rejects unknown values', () => {
    expect(validateSubsection('admin')).toBe(false);
    expect(validateSubsection('Conferences')).toBe(false);
    expect(validateSubsection('')).toBe(false);
  });
});

describe('validateUrl', () => {
  it('accepts http and https URLs', () => {
    expect(validateUrl('http://example.org')).toBe(true);
    expect(validateUrl('https://example.org/path?q=1')).toBe(true);
  });
  it('rejects other schemes and garbage', () => {
    expect(validateUrl('javascript:alert(1)')).toBe(false);
    expect(validateUrl('ftp://example.org')).toBe(false);
    expect(validateUrl('not a url')).toBe(false);
    expect(validateUrl('')).toBe(false);
  });
  it('rejects URLs with leading, trailing, or embedded whitespace', () => {
    expect(validateUrl('  https://example.org')).toBe(false);
    expect(validateUrl('https://example.org  ')).toBe(false);
    expect(validateUrl('https://example.org' + String.fromCharCode(10))).toBe(false);
    expect(validateUrl('https://exam ple.org')).toBe(false);
    expect(validateUrl('https://example.org' + String.fromCharCode(9))).toBe(false);
  });
});

describe('validateShortString', () => {
  it('accepts strings up to 200 chars', () => {
    expect(validateShortString('hello')).toBe(true);
    expect(validateShortString('x'.repeat(200))).toBe(true);
  });
  it('rejects empty, too-long, or newline-bearing strings', () => {
    expect(validateShortString('')).toBe(false);
    expect(validateShortString('x'.repeat(201))).toBe(false);
    expect(validateShortString('one' + String.fromCharCode(10) + 'two')).toBe(false);
    expect(validateShortString('one' + String.fromCharCode(13) + 'two')).toBe(false);
  });
  it('rejects Unicode line and paragraph separators', () => {
    expect(validateShortString('one' + String.fromCharCode(0x2028) + 'two')).toBe(false);
    expect(validateShortString('one' + String.fromCharCode(0x2029) + 'two')).toBe(false);
  });
});
