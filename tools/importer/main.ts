import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

import { buildReports } from './buildReports.ts';
import { companyNameFromFilename } from './companyName.ts';
import type { Company } from './reporting/report.ts';
import { templatesForCountry, type ReportTemplate } from './reporting/reportTemplate.ts';
import type { ReportTemplateSummary } from './reporting/reportTemplateIndex.ts';
import { slugify } from './slug.ts';

/**
 * The importer, run at build time. It stands in for the backend described in the
 * dossier: it reads a Provider payload once and writes the JSON the application
 * fetches, so the general ledger never reaches a browser.
 *
 * Output is derived from the Provider's data and inherits its confidentiality.
 * The sample under `brief/` is a third party's real accounting record — neither
 * it nor anything computed from it belongs in the repository. The deployed site
 * is built from the synthetic ledger instead.
 *
 * One run imports one Company. Its Reports and ReportTemplate index live under
 * `{output-root}/companies/{company.id}/`; running the importer again for a
 * second Company writes beside the first, not over it — see ADR-0010.
 */

const TEMPLATES_DIR = new URL('./templates/', import.meta.url);

async function loadTemplates(): Promise<ReportTemplate[]> {
  const files = (await readdir(TEMPLATES_DIR)).filter((file) => file.endsWith('.json')).sort();

  return Promise.all(
    files.map(async (file) => {
      const contents = await readFile(new URL(file, TEMPLATES_DIR), 'utf8');

      const template = JSON.parse(contents) as ReportTemplate;

      // A template missing its kind would quietly be treated as one kind and
      // give wrong figures for the other; missing its country, it would quietly
      // apply to every Company's chart, including ones it was never written
      // for. Refuse both here rather than downstream.
      if (template.kind !== 'BalanceSheet' && template.kind !== 'ProfitAndLoss') {
        throw new Error(
          `ReportTemplate ${file} must say whether its kind is a BalanceSheet or a ProfitAndLoss.`,
        );
      }

      if (!template.country) {
        throw new Error(`ReportTemplate ${file} must say which country's chart it follows.`);
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

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    // No previous run, or its output was never written — a fresh start, not
    // an error.
    return fallback;
  }
}

/**
 * Adds or replaces this Company's entry in `{outputRoot}/companies.json`,
 * leaving every other Company's entry as it was. Sorted by id, so the file's
 * content depends on which Companies have been imported, never on the order
 * they were imported in.
 */
async function upsertCompaniesIndex(outputRoot: string, company: Company): Promise<void> {
  const file = path.join(outputRoot, 'companies.json');
  const existing = await readJson<{ companies: Company[] }>(file, { companies: [] });
  const companies = [...existing.companies.filter((known) => known.id !== company.id), company];

  await writeJson(file, { companies: companies.sort((a, b) => a.id.localeCompare(b.id)) });
}

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      'company-id': { type: 'string' },
      'company-name': { type: 'string' },
      country: { type: 'string' },
    },
  });
  const [payloadFile, outputRoot] = positionals;

  if (!payloadFile || !outputRoot || !values.country) {
    throw new Error(
      'Usage: tsx tools/importer/main.ts <provider-payload.xml> <output-root> --country=<ISO-3166-1-alpha-2> [--company-id=<id>] [--company-name=<name>]',
    );
  }

  // Given, used as-is; omitted, derived from the payload's own filename. Either
  // way this never writes a name into a file that gets committed — see
  // ADR-0009. `country` has no such derivation: nothing about a payload's
  // filename says which chart-of-accounts convention its ledger follows.
  const name = values['company-name'] ?? companyNameFromFilename(payloadFile);
  const company: Company = {
    id: values['company-id'] ?? slugify(name),
    name,
    country: values.country,
  };
  const companyDir = path.join(outputRoot, 'companies', company.id);

  // A previous run's Reports would otherwise stay served after the ledger
  // changed, including Periods the new ledger does not have. Scoped to this
  // Company alone: importing a second Company must not touch the first's.
  await rm(path.join(companyDir, 'reports'), { recursive: true, force: true });

  const templates = templatesForCountry(await loadTemplates(), company.country);
  const index: ReportTemplateSummary[] = [];

  for (const template of templates) {
    // One pass per template. Re-reading the file costs seconds and keeps memory
    // proportional to one template's Accounts rather than to every template's at
    // once; if that ever stops being the right trade, it is the moment the
    // backend this design describes earns its place.
    const reports = await buildReports(payloadChunks(payloadFile), template, company);

    for (const report of reports) {
      await writeJson(
        path.join(companyDir, 'reports', template.id, `${report.period}.json`),
        report,
      );
    }

    index.push({
      id: template.id,
      name: template.name,
      periods: reports.map((report) => report.period),
    });
  }

  await writeJson(path.join(companyDir, 'templates.json'), { company, templates: index });
  await upsertCompaniesIndex(outputRoot, company);

  process.stdout.write(
    `Wrote ${String(index.reduce((n, t) => n + t.periods.length, 0))} Reports for ${String(index.length)} ReportTemplates (${company.name}, ${company.country}) into ${companyDir}\n`,
  );
}

await main();
