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
 * worker so that no request is made before the backend answering it exists.
 *
 * `onUnhandledRequest: 'warn'` rather than 'bypass': a request to a path no
 * handler claims has no real server to fall through to, so it would be served
 * `index.html` and fail on parsing. A warning names the cause. MSW exempts
 * scripts, styles and other static assets from this, so the console stays quiet
 * in normal use.
 */
async function startMockBackend(): Promise<void> {
  const { worker } = await import('./shared/mocks/browser.ts');

  await worker.start({ onUnhandledRequest: 'warn', quiet: true });
}

try {
  await startMockBackend();
} catch (cause) {
  // Render anyway. Without the worker every request fails, but a shell that
  // surfaces those failures beats a blank page that explains nothing; the
  // user-facing error states arrive with ticket 12.
  console.error('The mock backend failed to start; requests will not be served.', cause);
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
