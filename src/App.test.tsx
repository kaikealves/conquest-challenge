import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { renderApp } from './shared/testing/renderApp.tsx';

/**
 * Prior art for component tests: render the application and assert on what a
 * user can perceive — a role and an accessible name, never an implementation
 * detail. Everything the application does is asserted this way, against MSW.
 */
test('the application shell names what it presents', () => {
  renderApp();

  expect(screen.getByRole('heading', { name: 'Financial Statements', level: 1 })).toBeVisible();
});
