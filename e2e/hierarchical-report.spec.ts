import { expect, test } from '@playwright/test';

/**
 * A real browser against the production bundle. The built site ships no data,
 * so the Report is supplied at the network edge — the same JSON a static host
 * or a backend would answer, at the same URL.
 */
const report = {
  company: { id: 'hierarchy-co', name: 'Hierarchy Co', country: 'FR' },
  templateId: 'french-profit-and-loss',
  templateName: 'Profit and loss',
  period: '2016',
  currency: 'EUR',
  unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
  categories: [
    {
      label: 'Operating expenses',
      total: '850.50',
      accounts: [],
      children: [
        {
          label: 'External services',
          total: '850.50',
          children: [],
          accounts: [
            { code: '613200', name: 'Locations immobilières', total: '700.00' },
            { code: '622600', name: 'Honoraires', total: '150.50' },
          ],
        },
      ],
    },
  ],
};

test('expanding a Category down to its Accounts, and collapsing it again', async ({ page }) => {
  await page.route('**/data/companies.json', (route) =>
    route.fulfill({ json: { companies: [report.company] } }),
  );
  await page.route('**/data/companies/hierarchy-co/templates.json', (route) =>
    route.fulfill({
      json: {
        company: report.company,
        templates: [{ id: 'french-profit-and-loss', name: report.templateName, periods: ['2016'] }],
      },
    }),
  );
  await page.route('**/data/companies/hierarchy-co/reports/**', (route) =>
    route.fulfill({ json: report }),
  );
  await page.goto('/');

  await expect(page.getByText('613200')).toHaveCount(0);

  await page.getByRole('button', { name: 'Operating expenses' }).click();
  await page.getByRole('button', { name: 'External services' }).click();

  const account = page.getByRole('row', { name: /613200/ });
  await expect(account).toContainText('Locations immobilières');
  await expect(account).toContainText('€700.00');

  await page.getByRole('button', { name: 'Operating expenses' }).click();
  await expect(page.getByText('613200')).toHaveCount(0);
});
