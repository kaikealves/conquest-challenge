import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

import type { ReportTemplate } from '../src/features/reporting/reportTemplate.ts';
import { buildReportFromProviderPayload } from '../src/shared/pipeline/buildReport.ts';

/**
 * The importer as a build-time script, per ADR-0002: it reads a Provider payload
 * and emits Report JSON for the mock API to serve, so the 5.5 MB general ledger
 * never reaches the browser.
 *
 * It is also an executable specification of what a future backend importer must
 * do — the same translation, the same streaming, the same output.
 *
 * The Report it writes is derived from the Provider's data and inherits its
 * confidentiality. Write it somewhere gitignored; the sample ledger under
 * `brief/` is a third party's real accounting record and neither it nor anything
 * computed from it belongs in the repository.
 */

/**
 * Reads the file incrementally. The payload is never held as one string; each
 * chunk is decoded and handed straight to the parser.
 */
async function* payloadChunks(path: string): AsyncIterable<string> {
  const stream = createReadStream(path, { encoding: 'utf8' });

  for await (const chunk of stream) {
    yield chunk as string;
  }
}

async function main(): Promise<void> {
  const [payloadPath, templatePath, outputPath] = process.argv.slice(2);

  if (!payloadPath || !templatePath || !outputPath) {
    throw new Error(
      'Usage: tsx scripts/importLedger.ts <provider-payload.xml> <template.json> <report.json>',
    );
  }

  const template = JSON.parse(await readFile(templatePath, 'utf8')) as ReportTemplate;
  const report = await buildReportFromProviderPayload(payloadChunks(payloadPath), template);

  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  process.stdout.write(
    `Wrote ${outputPath}: ${String(report.categories.length)} Categories under "${report.template}".\n`,
  );
}

await main();
