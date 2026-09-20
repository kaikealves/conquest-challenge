import { expect, test } from '@playwright/test';

test('the built application is served and names what it presents', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Accounting Reports' })).toBeVisible();
});
