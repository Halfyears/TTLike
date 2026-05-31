import { prisma } from '@/lib/prisma'
import type { SessionContext } from './state-machine'

export type BadgeType =
  | 'FIRST_RESULT'
  | 'NO_PERFECT_TAKE'
  | 'STORYBOARD_EXTENDED'
  | 'WELCOME_BACK'

/** Human-readable labels for user display (QuietProgress) */
export const BADGE_LABELS: Record<BadgeType, string> = {
  FIRST_RESULT:       'First script captured',
  NO_PERFECT_TAKE:    'Ran the analysis again',
  STORYBOARD_EXTENDED:'Took it one step further',
  WELCOME_BACK:       'Came back after a break',
}

/**
 * Server-side: evaluate session facts against badge rules and insert new badges.
 * Principle: only match behavior facts — never evaluate performance.
 * Returns the list of badge types newly issued this call.
 */
export async function checkAndIssueBadges(
  userId: string,
  session: Pick<SessionContext, 'takeCount' | 'storyboardClicked' | 'copyUsed'>,
): Promise<BadgeType[]> {
  const existing = await prisma.badgeLog.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    select:  { badgeType: true, createdAt: true },
  })

  const toCreate: { userId: string; badgeType: string }[] = []
  const issued:   BadgeType[] = []

  function grant(type: BadgeType) {
    toCreate.push({ userId, badgeType: type })
    issued.push(type)
  }

  // ── FIRST_RESULT: only once, ever ─────────────────────────────────────────
  if (!existing.some(b => b.badgeType === 'FIRST_RESULT')) {
    grant('FIRST_RESULT')
  }

  // ── NO_PERFECT_TAKE: session had more than one analysis run ───────────────
  if (session.takeCount > 1) {
    grant('NO_PERFECT_TAKE')
  }

  // ── STORYBOARD_EXTENDED: user clicked Generate Storyboard ─────────────────
  if (session.storyboardClicked) {
    grant('STORYBOARD_EXTENDED')
  }

  // ── WELCOME_BACK: more than 7 days since last badge ───────────────────────
  if (existing.length > 0 && existing[0]) {
    const daysSince = (Date.now() - existing[0].createdAt.getTime()) / 86_400_000
    if (daysSince > 7) grant('WELCOME_BACK')
  }

  if (toCreate.length > 0) {
    await prisma.badgeLog.createMany({ data: toCreate })
  }

  return issued
}
