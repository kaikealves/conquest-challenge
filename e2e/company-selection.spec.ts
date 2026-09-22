import { expect, test, type Page } from '@playwright/test';

/**
 * The choice of Company lives in the address bar, outermost of the three —
 * see `ReportsPage`'s own doc comment. Checked in a real browser against the
 * built site, with the API answered at the network edge.
 */
const ALPHA = { id: 'alpha-co', name: 'Alpha Co', country: 'FR' };
const BETA = { id: 'beta-co', name: 'Beta Co', country: 'GB' };

async function serveTwoCompanies(page: Page) {
  await page.route('**/data/companies.json', (route) =>
    route.fulfill({ json: { companies: [ALPHA, BETA] } }),
  );
  await page.route(`**/data/companies/${ALPHA.id}/templates.json`, (route) =>
    route.fulfill({
      json: { company: ALPHA, templates: [{ id: 'report', name: 'Report', periods: ['2016'] }] },
    }),
  );
  await page.route(`**/data/companies/${ALPHA.id}/reports/report/2016.json`, (route) =>
    route.fulfill({
      json: {
        company: ALPHA,
        templateId: 'report',
        templateName: 'Report',
        period: '2016',
        currency: 'EUR',
        categories: [{ label: 'Only in Alpha', total: '1.00', children: [], accounts: [] }],
        unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
      },
    }),
  );
  await page.route(`**/data/companies/${BETA.id}/templates.json`, (route) =>
    route.fulfill({
      json: { company: BETA, templates: [{ id: 'report', name: 'Report', periods: ['2016'] }] },
    }),
  );
  await page.route(`**/data/companies/${BETA.id}/reports/report/2016.json`, (route) =>
    route.fulfill({
      json: {
        company: BETA,
        templateId: 'report',
        templateName: 'Report',
        period: '2016',
        currency: 'EUR',
        categories: [{ label: 'Only in Beta', total: '2.00', children: [], accounts: [] }],
        unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
      },
    }),
  );
}

test('the Company is on screen as soon as the ReportTemplates load', async ({ page }) => {
  await serveTwoCompanies(page);
  await page.goto('/');

  await expect(page.getByRole('combobox', { name: 'Company' })).toHaveValue(ALPHA.id);
});

test('choosing a Company changes the Report and the address together', async ({ page }) => {
  await serveTwoCompanies(page);
  await page.goto('/');

  await expect(page).toHaveURL(new RegExp(`/companies/${ALPHA.id}/reports/report/2016$`));
  await expect(page.getByRole('row', { name: /Only in Alpha/ })).toBeVisible();

  await page.getByRole('combobox', { name: 'Company' }).selectOption('Beta Co');

  await expect(page).toHaveURL(new RegExp(`/companies/${BETA.id}/reports/report/2016$`));
  await expect(page.getByRole('row', { name: /Only in Beta/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Only in Alpha/ })).toHaveCount(0);
});

test('a shared link opens the sender’s Company', async ({ page }) => {
  await serveTwoCompanies(page);
  await page.goto(`/companies/${BETA.id}`);

  await expect(page.getByRole('row', { name: /Only in Beta/ })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Company' })).toHaveValue(BETA.id);
});
