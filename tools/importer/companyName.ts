import path from 'node:path';

/**
 * A Company name derived from a payload's filename, used when the importer is
 * given none. Generic on purpose: it does not know anything about this
 * Provider's naming habits, only how to turn a filename into words. See
 * ADR-0009.
 */
export function companyNameFromFilename(filePath: string): string {
  const stem = path.basename(filePath, path.extname(filePath));

  return stem
    .split(/[-_\s]+/)
    .filter((word) => word !== '')
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
