/**
 * Client-side date utilities.
 *
 * All formatters pass `undefined` as the locale so the browser uses
 * the user's own locale and timezone — never a hardcoded 'en-US'.
 *
 * Safe to import in server components too (standard JS methods),
 * but timezone conversion only takes effect in the browser.
 */

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  year: 'numeric', month: 'short', day: 'numeric',
}

const DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  year: 'numeric', month: 'short', day: 'numeric',
  hour: '2-digit', minute: '2-digit',
}

/** "May 22, 2026" — uses browser locale & timezone */
export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, DATE_OPTS)
}

/** "May 22, 2026, 03:45 PM" — uses browser locale & timezone */
export function fmtDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, DATETIME_OPTS)
}

/**
 * Relative time: "just now" / "5m ago" / "2h ago" / "3d ago" / absolute date.
 * Falls back to fmtDate for anything older than 30 days.
 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return fmtDate(iso)
}
