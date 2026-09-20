import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { App } from './App.tsx';

/**
 * Prior art for component tests: render through React Testing Library, then
 * assert on what a user can perceive — a role and an accessible name, never an
 * implementation detail. From ticket 11 onward, name the test for the domain
 * rule it protects rather than for the thing it renders.
 */
test('the application shell names what it presents', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Accounting Reports' })).toBeVisible();
});
