import { expect, test } from 'vitest';

import { templatesForCountry, type ReportTemplate } from './reporting/reportTemplate.ts';

const templateFor = (id: string, country: string): ReportTemplate => ({
  id,
  name: id,
  kind: 'ProfitAndLoss',
  country,
  categories: [],
});

test('a Company only gets the templates for its own country', () => {
  const templates = [templateFor('french', 'FR'), templateFor('uk', 'GB')];

  expect(templatesForCountry(templates, 'FR').map((template) => template.id)).toEqual(['french']);
});

test('a country with no templates gets none, not an error', () => {
  const templates = [templateFor('french', 'FR')];

  expect(templatesForCountry(templates, 'DE')).toEqual([]);
});
