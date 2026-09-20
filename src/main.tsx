import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('No #root element to mount the application into.');
}

/**
 * In development the API is MSW, so a contributor can work without running the
 * importer first and can reach the failure cases on demand. In production the
 * same URLs are static JSON the importer wrote, per ADR-0007.
 *
 * The import sits behind `import.meta.env.DEV` so the mock is never in the
 * bundle a user downloads — MSW's browser build is 158 kB gzipped, larger than
 * React, and shipping it was what ADR-0007 was written to stop.
 */
async function startMockApiInDevelopment(): Promise<void> {
  if (!import.meta.env.DEV) {
    return;
  }

  const { worker } = await import('./shared/mocks/browser.ts');

  await worker.start({ onUnhandledRequest: 'warn', quiet: true });
}

try {
  await startMockApiInDevelopment();
} catch (cause) {
  // A shell that surfaces failing requests beats a blank page explaining
  // nothing; the user-facing error states arrive with ticket 12.
  console.error('The development mock API failed to start.', cause);
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
