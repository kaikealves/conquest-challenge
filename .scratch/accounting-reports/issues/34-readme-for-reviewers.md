# 34: README for reviewers

**What to build:** A README that a reviewer can act on in their first minute:
what the application is, where each part of the brief is answered, and how to
run it, with every statement true of the code as it stands.

**Blocked by:** 21 (README).

**Status:** resolved

- [x] A "start here" table: run the application, read the dossier, read the API contract
- [x] A table mapping each point of the brief to the file that answers it
- [x] The source layout matches the tree on disk
- [x] Instructions name only files and commands that exist
- [x] No section addressed to a coding assistant rather than a reader
- [x] Tickets 19, 20 and 21 marked resolved

## Comments

Found in the pre-submission review. The previous README described a
`ui/Report.tsx` and a `brief/chart-of-accounts.xml` that do not exist, called
the application both local-only and deployed, left ADR-0004 out of its list,
described ADR-0008 as about the importer, listed shadcn/ui though it is not
installed, and never linked the dossier.

Ticket 05 stays open: the dossier argues zero-sum validation for a backend with
a database (`GROUP BY` over a staging table), but not the streaming two-pass
design that ticket describes for the importer.
