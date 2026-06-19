import { d1Db } from '@/lib/cloudflare/d1Compat'
import type { SessionContext } from './state-machine'
import type { BadgeType } from './badge-types'

export type { BadgeType }

/**
 * Server-side: evaluate session facts against badge rules and insert new badges.
 * Principle: only match behavior facts — never evaluate performance.
 * Returns the list of badge types newly issued this call.
 */
export async function checkAndIssueBadges(
  userId: string,
  session: Pick<SessionContext, 'takeCount' | 'storyboardClicked' | 'copyUsed'>,
): Promise<BadgeType[]> {
  const existing = await d1Db.badgeLog.findMany({
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
    await d1Db.badgeLog.createMany({ data: toCreate })
  }

  return issued
}
