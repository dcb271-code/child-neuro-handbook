import { describe, it, expect } from 'vitest';
import { slugify, resolveTitle, type Metadata } from '../metadata';

describe('slugify', () => {
  it('lowercases and replaces non-alphanumerics with hyphens', () => {
    expect(slugify('Epilepsy Crash Course (Apr 2026).pdf'))
      .toBe('epilepsy-crash-course-apr-2026');
  });
  it('collapses repeated separators and trims', () => {
    expect(slugify('---foo___bar  baz.pptx')).toBe('foo-bar-baz');
  });
  it('handles names with no extension', () => {
    expect(slugify('My Notes')).toBe('my-notes');
  });
  it('returns "file" for input that slugifies to empty', () => {
    expect(slugify('!!!.pdf')).toBe('file');
    expect(slugify('')).toBe('file');
  });
});

describe('resolveTitle', () => {
  const md: Metadata = {
    links: [],
    fileTitles: {
      'resources/conferences/123__epilepsy-crash-course.pdf': 'Epilepsy Crash Course (Apr 2026)',
    },
  };

  it('uses fileTitles when present', () => {
    expect(
      resolveTitle('resources/conferences/123__epilepsy-crash-course.pdf', md),
    ).toBe('Epilepsy Crash Course (Apr 2026)');
  });

  it('derives a title-cased label from the slug when no override exists', () => {
    expect(resolveTitle('resources/lectures/456__hie-management.pdf', md))
      .toBe('Hie Management');
  });

  it('handles a missing slug part by falling back to the basename', () => {
    expect(resolveTitle('resources/misc/789.pdf', md)).toBe('789');
  });
});
