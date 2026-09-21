/**
 * The locale amounts are formatted in.
 *
 * Fixed rather than taken from the browser, deliberately: a Report is a document
 * people compare and share, and two colleagues reading the same URL should see
 * the same figures written the same way. It also keeps the tests from depending
 * on the machine they run on.
 *
 * The currency always comes from the Report itself; this decides only grouping,
 * separators and where the symbol sits.
 */
export const DISPLAY_LOCALE = 'en-GB';
