import { expect, test } from '@playwright/test';

/**
 * The Period lives in the address bar beside the ReportTemplate. Checked in a
 * real browser against the built site, with the API answered at the network edge.
 */
const reportFor = (period: string, total: string) => ({
  templateId: 'alpha',
  templateName: 'Alpha',
  period,
  currency: 'EUR',
  categories: [{ label: 'Expenses', total, children: [], accounts: [] }],
});

test.beforeEach(async ({ page }) => {
  await page.route('**/data/templates.json', (route) =>
    route.fulfill({
      json: { templates: [{ id: 'alpha', name: 'Alpha', periods: ['2015', '2016'] }] },
    }),
  );
  await page.route('**/data/reports/alpha/2015.json', (route) =>
    route.fulfill({ json: reportFor('2015', '100.00') }),
  );
  await page.route('**/data/reports/alpha/2016.json', (route) =>
    route.fulfill({ json: reportFor('2016', '250.00') }),
  );
});

test('changing the Period changes the totals and the address', async ({ page }) => {
  await page.goto('/');

  // A bare address is completed to the latest Period.
  await expect(page).toHaveURL(/\/reports\/alpha\/2016$/);
  await expect(page.getByRole('row', { name: /Expenses/ })).toContainText('€250.00');

  await page.getByRole('combobox', { name: 'Period' }).selectOption('2015');

  await expect(page).toHaveURL(/\/reports\/alpha\/2015$/);
  await expect(page.getByRole('row', { name: /Expenses/ })).toContainText('€100.00');
});

test('a copied address opens the Period its sender was looking at', async ({ page }) => {
  await page.goto('/reports/alpha/2015');

  await expect(page.getByRole('row', { name: /Expenses/ })).toContainText('€100.00');
  await expect(page.getByRole('combobox', { name: 'Period' })).toHaveValue('2015');
});

test('a Period with no Report is explained, and offers the Periods that exist', async ({
  page,
}) => {
  await page.goto('/reports/alpha/2016');
  await page.goto('/reports/alpha/1999');

  await expect(page.getByRole('alert')).toContainText('1999');

  await page.getByRole('link', { name: '2015' }).click();
  await expect(page.getByRole('row', { name: /Expenses/ })).toContainText('€100.00');
});

test('an address completed by redirect does not trap the Back button', async ({ page }) => {
  await page.goto('about:blank');
  await page.goto('/reports/alpha');
  await expect(page).toHaveURL(/\/reports\/alpha\/2016$/);

  await page.goBack();

  // Back leaves the application rather than bouncing off the bare address.
  await expect(page).toHaveURL('about:blank');
});

test('Back returns to the Period before', async ({ page }) => {
  await page.goto('/reports/alpha/2016');
  await page.getByRole('combobox', { name: 'Period' }).selectOption('2015');
  await expect(page.getByRole('row', { name: /Expenses/ })).toContainText('€100.00');

  await page.goBack();

  await expect(page.getByRole('row', { name: /Expenses/ })).toContainText('€250.00');
});
