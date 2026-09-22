import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, expect, test } from 'vitest';

import type { Company } from './reporting/report.ts';
import { upsertCompaniesIndex } from './upsertCompaniesIndex.ts';

/**
 * A real temporary directory rather than a mock: the whole point of this
 * function is what it does to a file on disk, and a fake filesystem could
 * agree with a bug the real one does not have.
 */
let outputRoot: string;

beforeEach(async () => {
  outputRoot = await mkdtemp(path.join(tmpdir(), 'companies-index-'));
});

afterEach(async () => {
  await rm(outputRoot, { recursive: true, force: true });
});

async function companiesIn(root: string): Promise<Company[]> {
  const contents = await readFile(path.join(root, 'companies.json'), 'utf8');

  return (JSON.parse(contents) as { companies: Company[] }).companies;
}

const acme: Company = { id: 'acme', name: 'Acme', country: 'FR' };
const bolt: Company = { id: 'bolt', name: 'Bolt', country: 'GB' };

test('a first import writes the one Company', async () => {
  await upsertCompaniesIndex(outputRoot, acme);

  expect(await companiesIn(outputRoot)).toEqual([acme]);
});

test('a second Company is added beside the first, not instead of it', async () => {
  await upsertCompaniesIndex(outputRoot, acme);
  await upsertCompaniesIndex(outputRoot, bolt);

  expect(await companiesIn(outputRoot)).toEqual([acme, bolt]);
});

test('importing the same Company again replaces its entry, not duplicates it', async () => {
  await upsertCompaniesIndex(outputRoot, acme);
  await upsertCompaniesIndex(outputRoot, bolt);
  await upsertCompaniesIndex(outputRoot, { ...acme, name: 'Acme Renamed' });

  const companies = await companiesIn(outputRoot);

  expect(companies).toHaveLength(2);
  expect(companies.find((company) => company.id === 'acme')?.name).toBe('Acme Renamed');
});

test('the result is sorted by id, regardless of import order', async () => {
  await upsertCompaniesIndex(outputRoot, bolt);
  await upsertCompaniesIndex(outputRoot, acme);

  expect((await companiesIn(outputRoot)).map((company) => company.id)).toEqual(['acme', 'bolt']);
});
