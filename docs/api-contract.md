# API contract

What the application fetches. Per
[ADR-0007](./adr/0007-static-json-is-the-api-not-msw.md) these are static JSON
files the importer writes, served over HTTP; MSW serves the same shapes in tests
and development. A real backend satisfying these three responses is a base-URL
change, not a rewrite.

The TypeScript the client codes against is
`src/features/reporting/api/contract.ts`. This document is the language-neutral
version, because a backend written in Kotlin cannot import a TypeScript type.

## Endpoints

| Method and path                                | 200                   | Other                                         |
| ---------------------------------------------- | --------------------- | --------------------------------------------- |
| `GET /data/templates.json`                     | `ReportTemplateIndex` | —                                             |
| `GET /data/reports/{templateId}/{period}.json` | `Report`              | `404` unknown template or Period, `500` error |

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
5. **`templateId` is a stable slug**, never the display name, because it appears
   in a shareable URL. Renaming a ReportTemplate must not break a bookmark.
6. **The Periods listed in the index resolve.** If the index advertises a Period,
   `GET` for it returns 200.
7. **A Report never contains an AuxiliaryAccount.** Those are replaced by their
   ControlAccount before aggregation; see
   [ADR-0001](./adr/0001-ledger-and-reporting-bounded-contexts.md).

## ReportTemplateIndex

```json
{
  "templates": [
    { "id": "french-chart", "name": "French chart of accounts", "periods": ["2015", "2016"] }
  ]
}
```

| Field     | Type     | Notes                                |
| --------- | -------- | ------------------------------------ |
| `id`      | string   | Stable slug used in the Report URL   |
| `name`    | string   | For display                          |
| `periods` | string[] | Ascending; each resolves to a Report |

## Report

```json
{
  "templateId": "french-chart",
  "templateName": "French chart of accounts",
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
  ]
}
```

| Field          | Type       | Notes                                      |
| -------------- | ---------- | ------------------------------------------ |
| `templateId`   | string     | Matches the slug in the URL                |
| `templateName` | string     | For display                                |
| `period`       | string     | The FiscalYear, `YYYY`                     |
| `currency`     | string     | ISO 4217                                   |
| `categories`   | Category[] | Ordered as the ReportTemplate defines them |

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
