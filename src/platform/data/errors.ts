/**
 * Database error boundaries.
 *
 * The adapter layer wraps every failure into DataUnavailableError so that
 * request handlers can distinguish "content not found" (return null / 404)
 * from "the persistent data source cannot be reached or is misconfigured"
 * (render a branded availability page and log something actionable
 * server-side). Internal details — driver messages, connection strings,
 * credentials — never reach the client; only the generic `cause` message is
 * logged on the server.
 */

export class DataUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'DataUnavailableError';
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

function describeCause(error: unknown): string {
  if (error instanceof Error) {
    // Prisma errors carry a one-line `message`; include the error name for
    // quick diagnosis (e.g. PrismaClientInitializationError) but never any
    // connection string or credential material that may be embedded.
    const connectionStrings = /postgres(ql)?:\/\/[^\s]+/gi;
    return `${error.name}: ${error.message.replace(connectionStrings, 'postgres://<redacted>')}`;
  }
  return String(error);
}

export function wrapDbError(error: unknown, context: string): DataUnavailableError {
  if (error instanceof DataUnavailableError) return error;
  return new DataUnavailableError(`Database operation failed while trying to ${context}.`, {
    cause: describeCause(error),
  });
}

export function isDataUnavailableError(error: unknown): error is DataUnavailableError {
  return error instanceof DataUnavailableError;
}
