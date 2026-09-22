import { expect, test } from 'vitest';

import { slugify } from './slug.ts';

test('lowercases and hyphenates a name into an id', () => {
  expect(slugify('Acme Freight Cooperative')).toBe('acme-freight-cooperative');
});

test('collapses runs of non-alphanumeric characters into one hyphen', () => {
  expect(slugify('Acme & Sons, Ltd.')).toBe('acme-sons-ltd');
});

test('has no leading or trailing hyphen', () => {
  expect(slugify('  Acme  ')).toBe('acme');
});
