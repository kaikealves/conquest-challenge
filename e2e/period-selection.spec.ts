import { expect, test } from '@playwright/test';

/**
 * The Period lives in the address bar beside the Company and ReportTemplate.
 * Checked in a real browser against the built site, with the API answered at
 * the network edge.
 */
const COMPANY = { id: 'period-co', name: 'Period Co', country: 'FR' };
const BASE = `/companies/${COMPANY.id}/reports/alpha`;

const reportFor = (period: string, total: string) => ({
  company: COMPANY,
  templateId: 'alpha',
  templateName: 'Alpha',
  period,
  currency: 'EUR',
  unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
  categories: [{ label: 'Expenses', total, children: [], accounts: [] }],
});

test.beforeEach(async ({ page }) => {
  await page.route('**/data/companies.json', (route) =>
    route.fulfill({ json: { companies: [COMPANY] } }),
  );
  await page.route(`**/data/companies/${COMPANY.id}/templates.json`, (route) =>
    route.fulfill({
      json: {
        company: COMPANY,
        templates: [{ id: 'alpha', name: 'Alpha', periods: ['2015', '2016'] }],
      },
    }),
  );
  await page.route(`**/data/companies/${COMPANY.id}/reports/alpha/2015.json`, (route) =>
    route.fulfill({ json: reportFor('2015', '100.00') }),
  );
  await page.route(`**/data/companies/${COMPANY.id}/reports/alpha/2016.json`, (route) =>
    route.fulfill({ json: reportFor('2016', '250.00') }),
  );
});

test('changing the Period changes the totals and the address', async ({ page }) => {
  await page.goto('/');

  // A bare address is completed to the latest Period.
  await expect(page).toHaveURL(new RegExp(`${BASE}/2016$`));
  await expect(page.getByRole('row', { name: /Expenses/ })).toContainText('€250.00');

  await page.getByRole('combobox', { name: 'Period' }).selectOption('2015');

  await expect(page).toHaveURL(new RegExp(`${BASE}/2015$`));
  await expect(page.getByRole('row', { name: /Expenses/ })).toContainText('€100.00');
});

test('a copied address opens the Period its sender was looking at', async ({ page }) => {
  await page.goto(`${BASE}/2015`);

  await expect(page.getByRole('row', { name: /Expenses/ })).toContainText('€100.00');
  await expect(page.getByRole('combobox', { name: 'Period' })).toHaveValue('2015');
});

test('a Period with no Report is explained, and offers the Periods that exist', async ({
  page,
}) => {
  await page.goto(`${BASE}/2016`);
  await page.goto(`${BASE}/1999`);

  await expect(page.getByRole('alert')).toContainText('1999');

  await page.getByRole('link', { name: '2015' }).click();
  await expect(page.getByRole('row', { name: /Expenses/ })).toContainText('€100.00');
});

test('an address completed by redirect does not trap the Back button', async ({ page }) => {
  await page.goto('about:blank');
  await page.goto(BASE);
  await expect(page).toHaveURL(new RegExp(`${BASE}/2016$`));

  await page.goBack();

  // Back leaves the application rather than bouncing off the bare address.
  await expect(page).toHaveURL('about:blank');
});

test('Back returns to the Period before', async ({ page }) => {
  await page.goto(`${BASE}/2016`);
  await page.getByRole('combobox', { name: 'Period' }).selectOption('2015');
  await expect(page.getByRole('row', { name: /Expenses/ })).toContainText('€100.00');

  await page.goBack();

  await expect(page.getByRole('row', { name: /Expenses/ })).toContainText('€250.00');
});
