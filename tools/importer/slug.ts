/**
 * A stable, URL-safe id derived from a display name, used when a Company's own
 * id is not given explicitly. Generic string handling only — see
 * `companyNameFromFilename` for the sibling rule this feeds from.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
