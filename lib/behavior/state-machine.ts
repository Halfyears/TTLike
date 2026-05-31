import { create } from 'zustand'

// ── Types ──────────────────────────────────────────────────────────────────────

export type State = 'ENTRY' | 'READY' | 'FIRST_TAKE' | 'FLOW' | 'COMPLETE'

export type BehaviorEvent =
  | 'URL_RESOLVED'
  | 'ANALYSIS_STARTED'
  | 'RESULT_READY'
  | 'COMPLETE_SESSION'
  | 'RESET'

/** In-memory only — resets on RESET, never persisted */
export interface SessionContext {
  takeCount:         number
  storyboardClicked: boolean
  copyUsed:          boolean
  startedAt:         number | null
}

interface BehaviorStore {
  state:           State
  session:         SessionContext
  dispatch:        (event: BehaviorEvent) => void
  // Session flag setters (session metadata, not state-machine state)
  markStoryboard:  () => void
  markCopy:        () => void
}

// ── Transition logic (pure) ───────────────────────────────────────────────────

function transition(s: State, e: BehaviorEvent): State {
  switch (s) {
    case 'ENTRY':
      return e === 'URL_RESOLVED'     ? 'READY'      : s
    case 'READY':
      if (e === 'ANALYSIS_STARTED')    return 'FIRST_TAKE'
      if (e === 'RESET')               return 'ENTRY'
      return s
    case 'FIRST_TAKE':
      if (e === 'RESULT_READY')        return 'FLOW'
      if (e === 'RESET')               return 'ENTRY'
      return s
    case 'FLOW':
      if (e === 'COMPLETE_SESSION')    return 'COMPLETE'
      if (e === 'ANALYSIS_STARTED')    return 'FIRST_TAKE'  // user re-analyzes
      if (e === 'RESET')               return 'ENTRY'
      return s
    case 'COMPLETE':
      return e === 'RESET'            ? 'ENTRY'      : s
    default:
      return s
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

const BLANK_SESSION: SessionContext = {
  takeCount: 0, storyboardClicked: false, copyUsed: false, startedAt: null,
}

export const useBehaviorStore = create<BehaviorStore>((set) => ({
  state:   'ENTRY',
  session: BLANK_SESSION,

  dispatch: (event) => set((s) => {
    const next = transition(s.state, event)
    let session = s.session
    if (event === 'RESET') {
      session = BLANK_SESSION
    } else if (event === 'ANALYSIS_STARTED') {
      // takeCount increment and startedAt stamp both live here — no direct store mutation needed
      session = {
        ...s.session,
        takeCount: s.session.takeCount + 1,
        startedAt: s.session.startedAt ?? Date.now(),
      }
    }
    return { state: next, session }
  }),

  markStoryboard: () => set((s) => ({ session: { ...s.session, storyboardClicked: true } })),
  markCopy:       () => set((s) => ({ session: { ...s.session, copyUsed: true } })),
}))
