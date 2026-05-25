/**
 * AdminKpiCard — unified KPI metric card used across all admin modules.
 *
 * Design spec:
 *   - Dark bg-gray-800, border-gray-700, rounded-xl, p-4
 *   - Icon (top-left) + label (xs, gray-400, uppercase)
 *   - Large value (2xl, font-black, white)
 *   - Optional sub-label (xs, gray-500)
 *   - Optional trend indicator (+N% green / -N% red)
 *   - Optional href wraps the card in a Link
 *
 * Color convention (pass via `color` prop):
 *   pink    → AI / core engine
 *   violet  → scripts / content
 *   blue    → users / accounts
 *   emerald → success / active
 *   amber   → warnings / pending
 *   red     → errors / failed
 *   gray    → neutral / infrastructure
 */

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type CardColor = 'pink' | 'violet' | 'blue' | 'emerald' | 'amber' | 'red' | 'gray'

const COLOR_MAP: Record<CardColor, string> = {
  pink:    'text-pink-400',
  violet:  'text-violet-400',
  blue:    'text-blue-400',
  emerald: 'text-emerald-400',
  amber:   'text-amber-400',
  red:     'text-red-400',
  gray:    'text-gray-400',
}

interface AdminKpiCardProps {
  icon:    LucideIcon
  label:   string
  value:   string | number
  sub?:    string
  trend?:  { value: number; label?: string }   // +N = green, -N = red
  color?:  CardColor
  href?:   string
  onClick?: () => void
  className?: string
}

function CardBody({
  icon: Icon, label, value, sub, trend, color = 'pink',
}: Omit<AdminKpiCardProps, 'href' | 'className'>) {
  const iconColor = COLOR_MAP[color]
  const trendColor = trend && trend.value > 0 ? 'text-emerald-400' : 'text-red-400'
  const trendSign  = trend && trend.value > 0 ? '+' : ''

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 h-full">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide truncate">
          {label}
        </span>
      </div>
      <p className="text-2xl font-black text-white tabular-nums leading-none mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <div className="flex items-center gap-2">
        {sub && <p className="text-xs text-gray-500 truncate flex-1">{sub}</p>}
        {trend != null && (
          <span className={`text-[11px] font-bold tabular-nums shrink-0 ${trendColor}`}>
            {trendSign}{trend.value}%{trend.label ? ` ${trend.label}` : ''}
          </span>
        )}
      </div>
    </div>
  )
}

export function AdminKpiCard({ href, onClick, className, ...props }: AdminKpiCardProps) {
  if (href) {
    return (
      <Link href={href} className={`block hover:scale-[1.02] transition-transform ${className ?? ''}`}>
        <CardBody {...props} />
      </Link>
    )
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left hover:scale-[1.02] hover:ring-1 hover:ring-indigo-500/50 transition-all rounded-xl ${className ?? ''}`}
      >
        <CardBody {...props} />
      </button>
    )
  }
  return (
    <div className={className}>
      <CardBody {...props} />
    </div>
  )
}
