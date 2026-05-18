import { cn } from '@/lib/utils'
import { Flame, TrendingUp, Zap, Minus } from 'lucide-react'

interface ViralScoreBadgeProps {
  score: number
  showLabel?: boolean
  className?: string
}

export function ViralScoreBadge({ score, showLabel = true, className }: ViralScoreBadgeProps) {
  const config =
    score >= 90 ? { label: 'Viral', color: 'text-red-600 bg-red-50 border-red-200', icon: Flame } :
    score >= 70 ? { label: 'Hot', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: Zap } :
    score >= 50 ? { label: 'Rising', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: TrendingUp } :
    { label: 'Normal', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: Minus }

  const Icon = config.icon

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
      config.color, className
    )}>
      <Icon className="h-3 w-3" />
      {score.toFixed(0)}
      {showLabel && ` · ${config.label}`}
    </span>
  )
}
