import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Connect, type Plugin, type ResolvedConfig } from 'vite';

import { API_BASE_URL } from './src/features/reporting/api/contract.ts';

/**
 * ADR-0007 rests on a Report that does not exist answering 404. That does not
 * happen by itself: a single-page-app server answers every unmatched path with
 * `index.html`, so a missing Report returns 200 and a page of HTML, and the
 * client fails while parsing JSON rather than seeing a clean not-found.
 *
 * The middleware is installed directly rather than returned, so it runs *before*
 * the fallback that would otherwise already have answered. That means it sees
 * every API request, including ones for files that exist, so it checks the file
 * system and stands aside for those.
 *
 * It is installed on the dev server too. There the API is normally MSW, but
 * `main.tsx` deliberately renders when the worker fails to start, and without
 * this that is exactly the case that returns HTML to a JSON parser.
 *
 * The deployed host needs the same exclusion from its rewrite rules; ticket 23
 * carries that, and `e2e/report-api.spec.ts` is what would catch its absence.
 */
function apiPathsAreNotApplicationRoutes(): Plugin {
  const prefix = `${API_BASE_URL}/`;
  let config: ResolvedConfig;

  const middleware =
    (servedFrom: () => string): Connect.NextHandleFunction =>
    (request, response, next) => {
      const url = request.url?.split('?')[0] ?? '';

      if (!url.startsWith(prefix)) {
        next();
        return;
      }

      // Resolve, then confirm containment: a URL carrying `..` must not become a
      // question about a file outside the served directory.
      const root = path.resolve(servedFrom());
      const served = path.resolve(root, `.${url}`);

      if (served.startsWith(`${root}${path.sep}`) && existsSync(served)) {
        next();
        return;
      }

      response.statusCode = 404;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ message: `Nothing at ${url}.` }));
    };

  return {
    name: 'api-paths-are-not-application-routes',
    configResolved(resolved) {
      config = resolved;
    },
    configureServer(server) {
      server.middlewares.use(middleware(() => config.root));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(() => path.join(config.root, config.build.outDir)));
    },
  };
}

/**
 * MSW's service worker is development-only infrastructure, but it has to sit in
 * `public/` to be served at the scope root a worker needs — serving it from
 * middleware is enough for `curl` and not enough for a real registration, which
 * fetches the script under stricter rules.
 *
 * So it ships to `public/` and is removed from the build output instead. A
 * production bundle carrying a mock service worker is dead weight and, worse,
 * advertises that the deployed site might be mocking its own API.
 * `e2e/report-api.spec.ts` is what holds this true.
 */
function keepMockServiceWorkerOutOfTheBuild(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'keep-mock-service-worker-out-of-the-build',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    async closeBundle() {
      await rm(path.join(config.root, config.build.outDir, 'mockServiceWorker.js'), {
        force: true,
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiPathsAreNotApplicationRoutes(),
    keepMockServiceWorkerOutOfTheBuild(),
  ],
});
