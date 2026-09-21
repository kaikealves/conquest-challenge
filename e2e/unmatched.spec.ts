import { expect, test } from '@playwright/test';

/**
 * Money no Category claimed is on screen, in a real browser against the built
 * site, with the API answered at the network edge.
 */
test('money the ReportTemplate does not cover is shown, not dropped', async ({ page }) => {
  await page.route('**/data/templates.json', (route) =>
    route.fulfill({
      json: { templates: [{ id: 'alpha', name: 'Alpha', periods: ['2016'] }] },
    }),
  );
  await page.route('**/data/reports/alpha/2016.json', (route) =>
    route.fulfill({
      json: {
        templateId: 'alpha',
        templateName: 'Alpha',
        period: '2016',
        currency: 'EUR',
        categories: [{ label: 'Expenses', total: '10.00', children: [], accounts: [] }],
        unmatched: {
          label: 'Unmatched',
          total: '500.50',
          children: [],
          accounts: [{ code: '411100', name: '', total: '500.50' }],
        },
      },
    }),
  );
  await page.goto('/');

  await expect(page.getByText(/1 Account matched none/)).toBeVisible();

  await page.getByRole('button', { name: 'Unmatched' }).click();
  await expect(page.getByRole('row', { name: /411100/ })).toContainText('€500.50');
});
