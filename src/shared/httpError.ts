/**
 * An Error carrying the HTTP status that produced it, so a retry policy can
 * tell a transient failure from a permanent one.
 *
 * A plain Error with a property rather than a subclass: the repo does not use
 * classes, and nothing here needs more than the status.
 */
export type HttpError = Error & { readonly status?: number | undefined };

export function httpError(message: string, status?: number): HttpError {
  return Object.assign(new Error(message), { status });
}

export function statusOf(error: unknown): number | undefined {
  if (error instanceof Error && 'status' in error) {
    const { status } = error as { status?: unknown };

    return typeof status === 'number' ? status : undefined;
  }

  return undefined;
}
