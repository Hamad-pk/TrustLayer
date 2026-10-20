import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Badge } from './ui'
import { fmtEth } from '../lib/format'
import { cn } from '../lib/cn'

export type Ag = {
  status: number; phase: number; currentIndex: number; endIndex: number; count: number; total: bigint
  freelancerAccepted: boolean; primaryAccepted: boolean; fallbackAccepted: boolean
}
const PHASE = ['working on it', 'waiting for the client', 'revision requested', 'in dispute']

/** Plain-language state for an agreement, shared by every list. */
export function describe(a: Ag): { label: string; tone: 'warning' | 'accent' | 'success' | 'neutral' | 'danger'; sub: string; settled: number; effective: number } {
  const effective = a.status === 1 ? a.count : a.endIndex + 1
  const settled = a.status === 1 ? 0 : Math.min(a.currentIndex, effective)
  if (a.status === 1) {
    const all = a.freelancerAccepted && a.primaryAccepted && a.fallbackAccepted
    return { label: 'Setting up', tone: 'warning', sub: all ? 'Ready to fund' : 'Waiting for acceptances', settled, effective }
  }
  if (a.status === 2) {
    return { label: a.phase === 3 ? 'In dispute' : 'In progress', tone: a.phase === 3 ? 'danger' : 'accent', sub: `Milestone ${a.currentIndex + 1}: ${PHASE[a.phase]}`, settled, effective }
  }
  if (a.status === 3) return { label: 'Completed', tone: 'success', sub: `${settled} of ${effective} settled`, settled, effective }
  return { label: 'Cancelled', tone: 'neutral', sub: settled > 0 ? `${settled} settled before it ended` : 'Ended before it started', settled, effective }
}

export function Progress({ a, className }: { a: Ag; className?: string }) {
  const { settled } = describe(a)
  return (
    <div className={cn('flex gap-1', className)} aria-label={`${settled} of ${a.count} milestones settled`}>
      {Array.from({ length: a.count }, (_, i) => (
        <span key={i} className={cn('h-1.5 min-w-1.5 flex-1 rounded-full',
          i < settled ? 'bg-mint' : i === a.currentIndex && a.status === 2 ? 'bg-ice' : i > a.endIndex && a.status !== 1 ? 'bg-line-soft opacity-50' : 'bg-line')} />
      ))}
    </div>
  )
}

export default function AgreementRow({ id, a }: { id: number; a: Ag }) {
  const d = describe(a)
  return (
    <Link to={`/agreement/${id}`} className="group grid grid-cols-[3.25rem_1fr_auto] items-center gap-x-4 gap-y-3 px-3 py-4 transition hover:bg-raise/60 sm:grid-cols-[4rem_minmax(0,1.2fr)_6.5rem_minmax(0,1fr)_1.25rem] sm:px-4">
      <span className="font-display text-lg font-semibold tabular text-mute">#{id}</span>
      <div className="min-w-0">
        <Badge tone={d.tone}>{d.label}</Badge>
        <div className="mt-1 truncate text-[13px] text-mute">{d.sub}</div>
      </div>
      <div className="text-right font-display text-base font-semibold tabular sm:text-left">{fmtEth(a.total)} <span className="text-xs font-normal text-faint">ETH</span></div>
      <Progress a={a} className="col-span-3 sm:col-span-1" />
      <ChevronRight className="hidden h-4 w-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink sm:block" aria-hidden />
    </Link>
  )
}
