import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Company } from './reporting/report.ts';

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    // No previous run, or its output was never written — a fresh start, not
    // an error.
    return fallback;
  }
}

/**
 * Adds or replaces this Company's entry in `{outputRoot}/companies.json`,
 * leaving every other Company's entry as it was. Sorted by id, so the file's
 * content depends on which Companies have been imported, never on the order
 * they were imported in.
 *
 * Not safe for two imports racing on the same output root at once: the
 * read-modify-write here is not atomic, so two concurrent runs can each read
 * before the other writes, and the later write wins — silently dropping the
 * earlier run's Company from this index (its `reports/` and `templates.json`
 * are untouched, just unlisted). Every caller today runs imports one at a
 * time, so this is a known limitation, not a bug that has been hit.
 */
export async function upsertCompaniesIndex(outputRoot: string, company: Company): Promise<void> {
  const file = path.join(outputRoot, 'companies.json');
  const existing = await readJson<{ companies: Company[] }>(file, { companies: [] });
  const companies = [...existing.companies.filter((known) => known.id !== company.id), company];

  await writeJson(file, { companies: companies.sort((a, b) => a.id.localeCompare(b.id)) });
}
