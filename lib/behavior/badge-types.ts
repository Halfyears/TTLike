/** Shared badge type definitions — no server imports, safe for client bundles */

export type BadgeType =
  | 'FIRST_RESULT'
  | 'NO_PERFECT_TAKE'
  | 'STORYBOARD_EXTENDED'
  | 'WELCOME_BACK'

export const BADGE_LABELS: Record<BadgeType, string> = {
  FIRST_RESULT:        'First script captured',
  NO_PERFECT_TAKE:     'Ran the analysis again',
  STORYBOARD_EXTENDED: 'Took it one step further',
  WELCOME_BACK:        'Came back after a break',
}
