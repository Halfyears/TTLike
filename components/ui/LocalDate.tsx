'use client'

/**
 * <LocalDate> — renders any date/time in the **user's local timezone**.
 *
 * Works inside server components (the tag is a client component island).
 * suppressHydrationWarning is intentional: the server renders with the
 * server locale; React ignores the mismatch and the browser immediately
 * shows the correct local time after hydration.
 *
 * Usage:
 *   <LocalDate date={row.created_at} />
 *   <LocalDate date={row.published_at} format="datetime" />
 *   <LocalDate date={row.last_sign_in} format="relative" />
 */

import { fmtDate, fmtDateTime, timeAgo } from '@/lib/dateUtils'

interface Props {
  date: string | Date | null | undefined
  format?: 'date' | 'datetime' | 'relative'
  className?: string
}

export function LocalDate({ date, format = 'date', className }: Props) {
  if (!date) return <span className={className}>—</span>

  const iso = typeof date === 'string' ? date : (date as Date).toISOString()

  const text =
    format === 'relative' ? timeAgo(iso) :
    format === 'datetime' ? fmtDateTime(iso) :
    fmtDate(iso)

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  )
}
