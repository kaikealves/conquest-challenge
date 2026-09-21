import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { buildReports } from './buildReports.ts';
import type { ReportTemplate } from './reporting/reportTemplate.ts';

/**
 * The importer, run at build time. It stands in for the backend described in the
 * dossier: it reads a Provider payload once and writes the JSON the application
 * fetches, so the general ledger never reaches a browser.
 *
 * Output is derived from the Provider's data and inherits its confidentiality.
 * The sample under `brief/` is a third party's real accounting record — neither
 * it nor anything computed from it belongs in the repository. The deployed site
 * is built from the synthetic ledger instead.
 */

const TEMPLATES_DIR = new URL('./templates/', import.meta.url);

async function loadTemplates(): Promise<ReportTemplate[]> {
  const files = (await readdir(TEMPLATES_DIR)).filter((file) => file.endsWith('.json')).sort();

  return Promise.all(
    files.map(async (file) => {
      const contents = await readFile(new URL(file, TEMPLATES_DIR), 'utf8');

      const template = JSON.parse(contents) as ReportTemplate;

      // A template missing its kind would quietly be treated as one kind
      // and give wrong figures for the other, so refuse it here.
      if (template.kind !== 'BalanceSheet' && template.kind !== 'ProfitAndLoss') {
        throw new Error(
          `ReportTemplate ${file} must say whether its kind is a BalanceSheet or a ProfitAndLoss.`,
        );
      }

      return template;
    }),
  );
}

/** Reads the file incrementally; the payload is never held as one string. */
async function* payloadChunks(file: string): AsyncIterable<string> {
  for await (const chunk of createReadStream(file, { encoding: 'utf8' })) {
    yield chunk as string;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const [payloadFile, outputDir] = process.argv.slice(2);

  if (!payloadFile || !outputDir) {
    throw new Error('Usage: tsx tools/importer/main.ts <provider-payload.xml> <output-dir>');
  }

  const templates = await loadTemplates();
  const index: { id: string; name: string; periods: string[] }[] = [];

  for (const template of templates) {
    // One pass per template. Re-reading the file costs seconds and keeps memory
    // proportional to one template's Accounts rather than to every template's at
    // once; if that ever stops being the right trade, it is the moment the
    // backend this design describes earns its place.
    const reports = await buildReports(payloadChunks(payloadFile), template);

    for (const report of reports) {
      await writeJson(
        path.join(outputDir, 'reports', template.id, `${report.period}.json`),
        report,
      );
    }

    index.push({
      id: template.id,
      name: template.name,
      periods: reports.map((report) => report.period),
    });
  }

  await writeJson(path.join(outputDir, 'templates.json'), { templates: index });

  process.stdout.write(
    `Wrote ${String(index.reduce((n, t) => n + t.periods.length, 0))} Reports for ${String(index.length)} ReportTemplates into ${outputDir}\n`,
  );
}

await main();
