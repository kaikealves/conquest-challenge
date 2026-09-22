import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import { REPORT_URL_PATTERN } from './api/contract.ts';
import { server } from '../../shared/mocks/node.ts';
import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * Seam 2 again: expanding a Category to find the Accounts behind its total.
 */
const expandControl = (label: string) => screen.findByRole('button', { name: new RegExp(label) });

test('Categories start collapsed, so the Accounts are not on screen yet', async () => {
  renderApp();

  await screen.findByRole('row', { name: /Operating expenses/ });

  expect(screen.queryByRole('row', { name: /Purchases/ })).not.toBeInTheDocument();
  expect(screen.queryByText('Achats stockés')).not.toBeInTheDocument();
});

test('a Category expands to show its children, and collapses again', async () => {
  const user = userEvent.setup();
  renderApp();

  const control = await expandControl('Operating expenses');
  expect(control).toHaveAttribute('aria-expanded', 'false');

  await user.click(control);

  expect(control).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('row', { name: /Purchases/ })).toBeInTheDocument();
  expect(screen.getByRole('row', { name: /External services/ })).toBeInTheDocument();

  await user.click(await expandControl('External services'));
  expect(screen.getByRole('row', { name: /613200/ })).toBeInTheDocument();

  await user.click(control);

  expect(control).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('row', { name: /Purchases/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('row', { name: /613200/ })).not.toBeInTheDocument();
});

test('an Account shows both its AccountCode and its name, with its total', async () => {
  const user = userEvent.setup();
  renderApp();

  await user.click(await expandControl('Operating expenses'));
  await user.click(await expandControl('External services'));

  const account = screen.getByRole('row', { name: /613200/ });

  expect(account).toHaveTextContent('613200');
  expect(account).toHaveTextContent('Locations immobilières');
  expect(account).toHaveTextContent('€700.00');
});

test('a Category with nothing beneath it offers nothing to expand', async () => {
  renderApp();

  await screen.findByRole('row', { name: /Operating expenses/ });
  await userEvent.setup().click(await expandControl('Operating expenses'));

  expect(screen.getByRole('row', { name: /Staff costs/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Staff costs/ })).not.toBeInTheDocument();
});

test('the expand control works from the keyboard', async () => {
  const user = userEvent.setup();
  renderApp();

  const control = await expandControl('Financial');

  // A button is in the tab order by being a button; focusing it stands in for
  // reaching it, and the keys are what this test is about.
  control.focus();
  expect(control).toHaveFocus();

  await user.keyboard('{Enter}');
  expect(control).toHaveAttribute('aria-expanded', 'true');

  await user.keyboard(' ');
  expect(control).toHaveAttribute('aria-expanded', 'false');
});

test('nesting is not limited to two levels', async () => {
  const user = userEvent.setup();
  const nest = (depth: number): unknown => ({
    label: `Level ${String(depth)}`,
    total: '10.00',
    children: depth < 5 ? [nest(depth + 1)] : [],
    accounts: depth === 5 ? [{ code: '999', name: 'Deepest account', total: '10.00' }] : [],
  });

  server.use(
    http.get(REPORT_URL_PATTERN, () =>
      HttpResponse.json({
        company: { name: 'Test Co' },
        templateId: 'french-profit-and-loss',
        templateName: 'Profit and loss',
        period: '2016',
        currency: 'EUR',
        unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
        categories: [nest(1)],
      }),
    ),
  );
  renderApp();

  for (let depth = 1; depth <= 5; depth += 1) {
    await user.click(await expandControl(`Level ${String(depth)}`));
  }

  expect(screen.getByRole('row', { name: /Deepest account/ })).toBeInTheDocument();
});

test('each level sits further in than the one above it', async () => {
  const user = userEvent.setup();
  renderApp();

  await user.click(await expandControl('Operating expenses'));
  await user.click(await expandControl('External services'));

  const indent = (name: RegExp) =>
    parseFloat(screen.getByRole('row', { name }).querySelector('th')?.style.paddingLeft ?? '0');

  expect(indent(/Operating expenses/)).toBeLessThan(indent(/External services/));
  expect(indent(/External services/)).toBeLessThan(indent(/613200/));
});
