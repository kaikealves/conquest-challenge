import type { CSSProperties } from 'react';

/**
 * How far in a row sits. Inline rather than a Tailwind class because the depth
 * is unbounded, and Tailwind generates only the classes it can see written out.
 * The first level gets no indent so the top of a Report lines up with its header.
 */
export function indentation(depth: number): CSSProperties {
  return { paddingLeft: `${String(depth * 1.25)}rem` };
}
