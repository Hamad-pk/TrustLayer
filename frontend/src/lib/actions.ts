export type Action =
  | 'submit'
  | 'approve'
  | 'requestRevision'
  | 'openDispute'
  | 'resolve'
  | 'defaultSplit'
  | 'expire'
  | 'endAfterCurrent'
  | 'withdraw'

export type AgreementState = {
  status: number // 1 Proposed, 2 Active, 3 Completed, 4 Cancelled
  phase: number // 0 Working, 1 Submitted, 2 RevisionRequested, 3 Disputed
  currentIndex: number
  endIndex: number
  phaseDeadline: number
  disputeOpenedAt: number
  clientCredit: bigint
  freelancerCredit: bigint
}
export type Roles = { client: boolean; freelancer: boolean; primary: boolean; fallback: boolean }

const DAY = 86_400
export const PRIMARY_WINDOW = 14 * DAY
export const FALLBACK_WINDOW = 14 * DAY

/**
 * The single source of truth for which buttons the UI offers. It mirrors the contract's rules
 * (docs/transition-table.md) and is tested against the deployed contract for every role and phase.
 * `now` is unix seconds. The contract re-checks everything, so this only controls what is shown.
 */
export function isAllowed(action: Action, a: AgreementState, now: number, r: Roles): boolean {
  const active = a.status === 2
  switch (action) {
    case 'submit':
      return active && r.freelancer && (a.phase === 0 || a.phase === 2) && now < a.phaseDeadline
    case 'approve':
      return active && r.client && a.phase === 1
    case 'requestRevision':
      return active && r.client && a.phase === 1 && now < a.phaseDeadline
    case 'openDispute':
      return (
        active &&
        ((a.phase === 1 && (r.client || (r.freelancer && now >= a.phaseDeadline))) || (a.phase === 2 && r.freelancer))
      )
    case 'resolve': {
      if (!active || a.phase !== 3) return false
      const t = now - a.disputeOpenedAt
      return (r.primary && t < PRIMARY_WINDOW) || (r.fallback && t >= PRIMARY_WINDOW && t < PRIMARY_WINDOW + FALLBACK_WINDOW)
    }
    case 'defaultSplit':
      return active && a.phase === 3 && now >= a.disputeOpenedAt + PRIMARY_WINDOW + FALLBACK_WINDOW
    case 'expire':
      return active && (a.phase === 0 || a.phase === 2) && now >= a.phaseDeadline
    case 'endAfterCurrent':
      return active && r.client && a.endIndex > a.currentIndex
    case 'withdraw':
      return (r.client && a.clientCredit > 0n) || (r.freelancer && a.freelancerCredit > 0n)
  }
}
