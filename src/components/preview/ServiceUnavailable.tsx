/**
 * Branded fallback shown when the persistent data source is unreachable or
 * misconfigured. Never renders seed content in its place, and never exposes
 * driver errors, connection strings, or credentials — the actionable detail
 * is logged server-side only.
 */

export function ServiceUnavailable({ note }: { note?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-100">
      <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 text-2xl">
        ⚠
      </span>
      <h1 className="mt-5 text-2xl font-bold sm:text-3xl">This website is temporarily unavailable</h1>
      <p className="mt-3 max-w-md leading-relaxed text-slate-400">
        Its content is stored in a database that is currently unreachable. Please try again shortly.
      </p>
      {note && <p className="mt-2 text-xs text-slate-600">{note}</p>}
    </div>
  );
}
