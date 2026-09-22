import { expect, test } from 'vitest';

import { companyNameFromFilename } from './companyName.ts';

/**
 * A last-resort label when the importer is run with no Company name given.
 * There is nothing to be clever about: it takes the file it was handed and
 * makes it readable, nothing more.
 *
 * Fixture names here are invented — never the real ledger's filename. Its
 * derived label is a fact about the real Company, which belongs no more in a
 * committed assertion than a figure from it would.
 */
test('turns a payload filename into a readable label', () => {
  expect(companyNameFromFilename('acme-freight-gl.xml')).toBe('Acme Freight Gl');
});

test('ignores the directories the file sits in', () => {
  expect(companyNameFromFilename('brief/acme-freight-gl.xml')).toBe('Acme Freight Gl');
});

test('title-cases each word and collapses separators', () => {
  expect(companyNameFromFilename('foo_bar--baz.xml')).toBe('Foo Bar Baz');
});

test('a file with no extension is used as-is', () => {
  expect(companyNameFromFilename('acme-freight-gl')).toBe('Acme Freight Gl');
});

test('an all-caps stem is not shouted back', () => {
  expect(companyNameFromFilename('ACME.xml')).toBe('Acme');
});
