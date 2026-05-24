'use client'

/**
 * <Greeting> — renders a time-of-day greeting using the browser's local clock.
 * Must be a client component so it reads the user's timezone, not the server's UTC.
 *
 * Usage: <Greeting firstName="Alex" />
 */

interface Props {
  firstName: string
  className?: string
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Greeting({ firstName, className }: Props) {
  return (
    <span className={className} suppressHydrationWarning>
      {getGreeting()}, {firstName}! 👋
    </span>
  )
}
