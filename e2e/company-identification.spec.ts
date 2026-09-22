import { expect, test } from '@playwright/test';

/**
 * Whose data this is, in a real browser against the built site.
 */
test('the Company is on screen as soon as the ReportTemplates load', async ({ page }) => {
  await page.route('**/data/templates.json', (route) =>
    route.fulfill({
      json: {
        company: { name: 'Riverside Textiles' },
        templates: [{ id: 'alpha', name: 'Alpha', periods: ['2016'] }],
      },
    }),
  );
  await page.route('**/data/reports/alpha/2016.json', (route) =>
    route.fulfill({
      json: {
        company: { name: 'Riverside Textiles' },
        templateId: 'alpha',
        templateName: 'Alpha',
        period: '2016',
        currency: 'EUR',
        categories: [{ label: 'Expenses', total: '10.00', children: [], accounts: [] }],
        unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
      },
    }),
  );
  await page.goto('/');

  await expect(page.getByText('Riverside Textiles')).toBeVisible();
});
