export function fileIdFor(pathname: string): string {
  return 'file-' + pathname.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
