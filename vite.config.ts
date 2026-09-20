import { existsSync } from 'node:fs';
import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';

import { API_BASE_URL } from './src/features/reporting/api/contract.ts';

/**
 * ADR-0007 rests on a Report that does not exist answering 404. That does not
 * happen by itself: a single-page-app server answers every unmatched path with
 * `index.html`, so a missing Report would return 200 and a page of HTML, and the
 * client would fail while parsing JSON rather than seeing a clean not-found.
 *
 * The middleware is installed directly rather than returned, so it runs *before*
 * the fallback that would otherwise have already answered. That means it sees
 * every API request, including ones for files that do exist, so it checks the
 * file system and stands aside for those.
 *
 * The deployed host needs the same exclusion from its rewrite rules; ticket 23
 * carries that, and the end-to-end test here is what would catch its absence.
 */
function apiPathsAreNotApplicationRoutes(): Plugin {
  const prefix = `${API_BASE_URL}/`;
  let config: ResolvedConfig;

  return {
    name: 'api-paths-are-not-application-routes',
    configResolved(resolved) {
      config = resolved;
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url?.split('?')[0] ?? '';

        if (!url.startsWith(prefix)) {
          next();
          return;
        }

        const served = path.join(config.root, config.build.outDir, url);

        if (existsSync(served)) {
          next();
          return;
        }

        response.statusCode = 404;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ message: `Nothing at ${url}.` }));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiPathsAreNotApplicationRoutes()],
});
