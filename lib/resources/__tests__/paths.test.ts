import { describe, it, expect } from 'vitest';
import { blobPathFor, slugify, isUploadablePath, RESOURCES_PREFIX } from '../paths';
import { METADATA_PATH } from '../metadata';

describe('blobPathFor', () => {
  it('namespaces by subsection and keeps the extension', () => {
    const p = blobPathFor('lectures', 'Neonatal Seizures.PDF');
    expect(p).toMatch(/^resources\/lectures\/\d+__neonatal-seizures\.pdf$/);
  });

  it('produces a path its own validator accepts', () => {
    for (const sub of ['conferences', 'lectures', 'misc', 'general', 'journal'] as const) {
      expect(isUploadablePath(blobPathFor(sub, 'a file.pdf'))).toBe(true);
    }
  });

  it('survives names with no usable characters', () => {
    expect(slugify('###.pdf')).toBe('file');
    expect(isUploadablePath(blobPathFor('misc', '###.pdf'))).toBe(true);
  });
});

describe('isUploadablePath', () => {
  // The browser now chooses the pathname and asks the server to sign it, so
  // this is the whole security boundary on where an upload can land.
  it('rejects paths outside the resources prefix', () => {
    expect(isUploadablePath('other/thing.pdf')).toBe(false);
    expect(isUploadablePath('/resources/misc/a.pdf')).toBe(false);
    expect(isUploadablePath('a.pdf')).toBe(false);
  });

  it('rejects an unknown subsection', () => {
    expect(isUploadablePath('resources/payroll/a.pdf')).toBe(false);
    expect(isUploadablePath('resources//a.pdf')).toBe(false);
  });

  it('rejects traversal and nesting', () => {
    expect(isUploadablePath('resources/misc/../_metadata.json')).toBe(false);
    expect(isUploadablePath('resources/../secrets.json')).toBe(false);
    expect(isUploadablePath('resources/misc/sub/dir.pdf')).toBe(false);
  });

  it('rejects a bare subsection with no filename', () => {
    expect(isUploadablePath('resources/misc/')).toBe(false);
    expect(isUploadablePath('resources/misc')).toBe(false);
  });

  it('does not accept the metadata blob', () => {
    // The route also checks this explicitly; belt and braces, because
    // overwriting it would drop every link and file title at once.
    expect(METADATA_PATH.startsWith(RESOURCES_PREFIX)).toBe(true);
    expect(isUploadablePath(METADATA_PATH)).toBe(false);
  });
});
