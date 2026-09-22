import { expect, test, type Page } from '@playwright/test';

/**
 * The choice of ReportTemplate lives in the address bar. jsdom has no address
 * bar worth trusting, so this is checked in a real browser against the built
 * site, with the API answered at the network edge.
 */
const summary = (id: string, name: string) => ({ id, name, periods: ['2016'] });

const reportNamed = (id: string, name: string, label: string) => ({
  company: { name: 'Two Templates Co' },
  templateId: id,
  templateName: name,
  period: '2016',
  currency: 'EUR',
  unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
  categories: [{ label, total: '1.00', children: [], accounts: [] }],
});

async function serveTwoTemplates(page: Page) {
  await page.route('**/data/templates.json', (route) =>
    route.fulfill({
      json: {
        company: { name: 'Two Templates Co' },
        templates: [summary('alpha', 'Alpha'), summary('beta', 'Beta')],
      },
    }),
  );
  await page.route('**/data/reports/alpha/2016.json', (route) =>
    route.fulfill({ json: reportNamed('alpha', 'Alpha', 'Only in alpha') }),
  );
  await page.route('**/data/reports/beta/2016.json', (route) =>
    route.fulfill({ json: reportNamed('beta', 'Beta', 'Only in beta') }),
  );
}

test('choosing a ReportTemplate puts it in the address', async ({ page }) => {
  await serveTwoTemplates(page);
  await page.goto('/');

  await expect(page).toHaveURL(/\/reports\/alpha\/2016$/);

  await page.getByRole('combobox', { name: 'Report template' }).selectOption('Beta');

  await expect(page).toHaveURL(/\/reports\/beta\/2016$/);
  await expect(page.getByRole('row', { name: /Only in beta/ })).toBeVisible();
});

test('a copied address opens the same Report in a fresh page', async ({ page, context }) => {
  await serveTwoTemplates(page);
  await page.goto('/reports/beta');

  const colleague = await context.newPage();
  await serveTwoTemplates(colleague);
  await colleague.goto(page.url());

  await expect(colleague.getByRole('row', { name: /Only in beta/ })).toBeVisible();
  await expect(colleague.getByRole('combobox', { name: 'Report template' })).toHaveValue('beta');
});

test('the browser Back button returns to the previous ReportTemplate', async ({ page }) => {
  await serveTwoTemplates(page);
  await page.goto('/reports/alpha');
  await page.getByRole('combobox', { name: 'Report template' }).selectOption('Beta');
  await expect(page.getByRole('row', { name: /Only in beta/ })).toBeVisible();

  await page.goBack();

  await expect(page.getByRole('row', { name: /Only in alpha/ })).toBeVisible();
});
