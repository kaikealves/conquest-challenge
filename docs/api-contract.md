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

8. **A BalanceSheet nets to zero, Result included.** Its last top-level
   Category is `Result`: the net of the revenue and expense Accounts, in ledger
   sign (a profit is a credit, so negative). Unlike other Categories it holds
   revenue and expense Accounts directly and has no children, so a client must
   not assume every Account is a balance-sheet one. A BalanceSheet includes
   balances carried forward from the previous FiscalYear; a ProfitAndLoss
   excludes them. The payload does not say which kind a Report is; a client has
   no arithmetic to do that would need it.

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

## ReportTemplateIndex

```json
{
  "templates": [
    { "id": "french-profit-and-loss", "name": "Profit and loss", "periods": ["2015", "2016"] }
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
