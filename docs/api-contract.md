# API contract

What the application fetches. Per
[ADR-0007](./adr/0007-static-json-is-the-api-not-msw.md) these are static JSON
files the importer writes, served over HTTP; MSW serves the same shapes in tests
and development. A real backend satisfying these responses is a base-URL
change, not a rewrite.

The TypeScript the client codes against is
`src/features/reporting/api/contract.ts`. This document is the language-neutral
version, because a backend written in Kotlin cannot import a TypeScript type.

## Endpoints

| Method and path                                                      | 200                   | Other                                                           |
| -------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------- |
| `GET /data/companies.json`                                           | `CompaniesIndex`      | —                                                               |
| `GET /data/companies/{companyId}/templates.json`                     | `ReportTemplateIndex` | `404` unknown Company                                           |
| `GET /data/companies/{companyId}/reports/{templateId}/{period}.json` | `Report`              | `404` unknown Company, unknown template, or Period, `500` error |

A non-200 carries `{ "message": string }`. The message is for a developer reading
a network tab, not for display.

## Rules the payload must satisfy

1. **Amounts are exact decimal strings, never numbers.** JSON has no exact
   decimal type and an IEEE double cannot represent every cent past 2^53 minor
   units. A backend must serialise from a decimal type, not from a float.
2. **A debit is positive and a credit negative.** Revenue therefore carries a
   negative total; presenting that is the client's business.
3. **An Account appears exactly once in a Report**, at the deepest Category whose
   roots match it. A parent that also listed it would show the same money twice.
4. **A Category's total equals its children's totals plus the Accounts it holds
   directly.** A client may rely on this and not re-add anything.
5. **`templateId` and `companyId` are stable slugs**, never a display name,
   because both appear in a shareable URL. Renaming a ReportTemplate or a
   Company must not break a bookmark.
6. **The Periods listed in a Company's ReportTemplate index resolve.** If it
   advertises a Period, `GET` for it returns 200.
7. **A Report never contains an AuxiliaryAccount.** Those are replaced by their
   ControlAccount before aggregation; see
   [ADR-0001](./adr/0001-ledger-and-reporting-bounded-contexts.md).

8. **A BalanceSheet nets to zero, Result included.** Its last top-level
   Category is `Result`: the net of the revenue and expense Accounts, in ledger
   sign (a profit is a credit, so negative). Unlike other Categories it holds
   revenue and expense Accounts directly and has no children, so a client must
   not assume every Account is a balance-sheet one. A BalanceSheet includes
   balances carried forward from the previous FiscalYear; a ProfitAndLoss
   excludes them. The payload does not say which kind a Report is; a client has
   no arithmetic to do that would need it.

   `missingOpeningBalances` is true for a BalanceSheet whose Period carries
   nothing forward although the ledger holds an earlier Period — as when a
   ledger is exported before the previous FiscalYear is closed. Its figures are
   then that year's movements, not balances, and a client says so beside them.
   It is always false for a ProfitAndLoss and for the ledger's first Period. A
   client reads its absence as false.

9. **A Report accounts for every Account its ReportTemplate answers for, in
   `unmatched` if nowhere else.** `unmatched` is always present and shaped as a
   Category with no children. It holds the Accounts within the template's scope
   that no Category (and not the Result) claimed, with their total. A template
   that covers everything sends it empty, with total `0.00`; it is never
   omitted, because an absent group would be indistinguishable from a Report
   that never checked. Summing the top-level Categories and `unmatched` gives
   the net of the Accounts in scope for the Period, so nothing the template is
   responsible for is lost between the ledger and the Report. A ProfitAndLoss's
   scope is revenue and expense Accounts, so its balance-sheet Accounts are out
   of scope, not unmatched. A payload without `unmatched` is not a valid Report.

10. **Every Report and ReportTemplateIndex carries the Company it belongs to.**
    `company` is never omitted; a client treats its absence the same as a
    missing `unmatched` — a failed load, not a Report to show. A
    ReportTemplate is only ever offered under a Company whose `country`
    matches the ReportTemplate's own; a Company's index never lists one that
    does not apply to it.

## CompaniesIndex

```json
{
  "companies": [{ "id": "acme-freight", "name": "Acme Freight Cooperative", "country": "FR" }]
}
```

| Field                 | Type   | Notes                       |
| --------------------- | ------ | --------------------------- |
| `companies[].id`      | string | Stable slug used in the URL |
| `companies[].name`    | string | For display                 |
| `companies[].country` | string | ISO 3166-1 alpha-2          |

## ReportTemplateIndex

```json
{
  "company": { "id": "acme-freight", "name": "Acme Freight Cooperative", "country": "FR" },
  "templates": [
    { "id": "french-profit-and-loss", "name": "Profit and loss", "periods": ["2015", "2016"] }
  ]
}
```

| Field     | Type     | Notes                                |
| --------- | -------- | ------------------------------------ |
| `company` | Company  | The Company this index belongs to    |
| `id`      | string   | Stable slug used in the Report URL   |
| `name`    | string   | For display                          |
| `periods` | string[] | Ascending; each resolves to a Report |

## Report

```json
{
  "company": { "id": "acme-freight", "name": "Acme Freight Cooperative", "country": "FR" },
  "templateId": "french-profit-and-loss",
  "templateName": "Profit and loss",
  "period": "2016",
  "currency": "EUR",
  "categories": [
    {
      "label": "Operating expenses",
      "total": "125.00",
      "accounts": [],
      "children": [
        {
          "label": "Purchases",
          "total": "125.00",
          "children": [],
          "accounts": [
            { "code": "606100", "name": "Fournitures", "total": "100.00" },
            { "code": "613200", "name": "Locations", "total": "25.00" }
          ]
        }
      ]
    }
  ],
  "unmatched": { "label": "Unmatched", "total": "0.00", "children": [], "accounts": [] }
}
```

| Field                    | Type       | Notes                                      |
| ------------------------ | ---------- | ------------------------------------------ |
| `company`                | Company    | See rule 10                                |
| `templateId`             | string     | Matches the slug in the URL                |
| `templateName`           | string     | For display                                |
| `period`                 | string     | The FiscalYear, `YYYY`                     |
| `currency`               | string     | ISO 4217                                   |
| `categories`             | Category[] | Ordered as the ReportTemplate defines them |
| `unmatched`              | Category   | See rule 9                                 |
| `missingOpeningBalances` | boolean    | See rule 8                                 |

### Category

| Field      | Type       | Notes                                          |
| ---------- | ---------- | ---------------------------------------------- |
| `label`    | string     | For display                                    |
| `total`    | string     | Exact decimal; children plus own Accounts      |
| `children` | Category[] | Nested to arbitrary depth; empty at a leaf     |
| `accounts` | Account[]  | Held directly by this Category and by no child |

### Account

| Field   | Type   | Notes                                                               |
| ------- | ------ | ------------------------------------------------------------------- |
| `code`  | string | AccountCode. Variable length — never pad it or parse it as a number |
| `name`  | string | May be empty if the Provider supplied none                          |
| `total` | string | Exact decimal                                                       |
