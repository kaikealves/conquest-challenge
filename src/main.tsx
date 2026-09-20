import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('No #root element to mount the application into.');
}

/**
 * MSW is the application's only backend, in every environment, per ADR-0003 —
 * not a development-only stand-in for a real service. Rendering waits for the
 * worker so the first request cannot escape unmocked.
 */
async function startMockBackend(): Promise<void> {
  const { worker } = await import('./mocks/browser.ts');

  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
}

await startMockBackend();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
