import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * Seam 2: whose data a reviewer is looking at. The Company shows as soon as the
 * ReportTemplate index has loaded, before or regardless of whether a Report has.
 */
test('the Company is shown once the ReportTemplates have loaded', async () => {
  renderApp();

  expect(await screen.findByText('Northwind Freight Cooperative')).toBeInTheDocument();
});

test('the Company is shown even when the link names no ReportTemplate that exists', async () => {
  renderApp('/reports/no-such-template');

  expect(await screen.findByText('Northwind Freight Cooperative')).toBeInTheDocument();
  expect(screen.getByText(/no ReportTemplate called/)).toBeInTheDocument();
});
