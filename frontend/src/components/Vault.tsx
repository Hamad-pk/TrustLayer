import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Badge } from './ui'
import { FundsBar, FundsLegend, fmtN, type Parts } from './FundsBar'
import { cn } from '../lib/cn'

type Ms = 'Pending' | 'Working' | 'Settled' | 'Disputed'
const TOTAL = 0.3

/** One example agreement, walked through its whole life. The four amounts always add up to the total. */
const STEPS: { caption: string; parts: Parts; ms: [Ms, Ms, Ms]; badge: string }[] = [
  { caption: 'Everyone has accepted the terms. Nothing is funded yet.', parts: { held: 0, free: 0, client: 0, withdrawn: 0 }, ms: ['Pending', 'Pending', 'Pending'], badge: 'Setting up' },
  { caption: 'The client funds 0.30 ETH. The contract holds it, not either person.', parts: { held: 0.3, free: 0, client: 0, withdrawn: 0 }, ms: ['Working', 'Pending', 'Pending'], badge: 'In progress' },
  { caption: 'Milestone 1 is approved. Its 0.10 ETH is now the freelancer\u2019s to withdraw.', parts: { held: 0.2, free: 0.1, client: 0, withdrawn: 0 }, ms: ['Settled', 'Working', 'Pending'], badge: 'In progress' },
  { caption: 'Milestone 2 is disputed. Its 0.10 ETH is frozen until an arbiter rules.', parts: { held: 0.2, free: 0.1, client: 0, withdrawn: 0 }, ms: ['Settled', 'Disputed', 'Pending'], badge: 'In dispute' },
  { caption: 'The arbiter splits it 70 / 30. Milestone 3 begins.', parts: { held: 0.1, free: 0.17, client: 0.03, withdrawn: 0 }, ms: ['Settled', 'Settled', 'Working'], badge: 'In progress' },
  { caption: 'The freelancer withdraws 0.17 ETH. Held, owed and withdrawn still add up to 0.30.', parts: { held: 0.1, free: 0, client: 0.03, withdrawn: 0.17 }, ms: ['Settled', 'Settled', 'Working'], badge: 'In progress' },
]
const msTone = { Pending: 'neutral', Working: 'accent', Settled: 'success', Disputed: 'danger' } as const

export default function Vault() {
  const reduce = useReducedMotion()
  const [i, setI] = useState(reduce ? 2 : 0)
  const [auto, setAuto] = useState(!reduce)
  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => setI((x) => (x + 1) % STEPS.length), 3400)
    return () => clearInterval(t)
  }, [auto])
  const s = STEPS[i]

  return (
    <div className="rounded-3xl border border-line bg-deep p-5 shadow-[0_40px_90px_-40px_rgb(0_0_0/0.9)] sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-mute">Example agreement</p>
        </div>
        <Badge tone={s.badge === 'In dispute' ? 'danger' : s.badge === 'Setting up' ? 'warning' : 'accent'}>{s.badge}</Badge>
      </div>

      <div className="mt-5 flex items-baseline justify-between">
        <div className="font-display text-5xl font-semibold tracking-tight tabular">{fmtN(TOTAL)}<span className="ml-2 text-lg font-normal text-faint">ETH</span></div>
        <span className="text-sm text-mute">3 milestones</span>
      </div>

      <FundsBar parts={s.parts} total={TOTAL} className="mt-4" />
      <FundsLegend parts={s.parts} className="mt-5" />

      <ul className="mt-6 divide-y divide-line-soft border-y border-line-soft">
        {s.ms.map((m, k) => (
          <li key={k} className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-ink">Milestone {k + 1}</span>
            <span className="flex items-center gap-4">
              <span className="tabular text-mute">0.10 ETH</span>
              <Badge tone={msTone[m]} className="w-[88px] justify-center">{m}</Badge>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 min-h-[44px]" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={i} className="text-[15px] leading-snug text-ink"
            initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.25 }}>
            {s.caption}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {STEPS.map((_, k) => (
          <button key={k} aria-label={`Show step ${k + 1} of ${STEPS.length}`} onClick={() => { setAuto(false); setI(k) }}
            className={cn('h-1.5 cursor-pointer rounded-full transition-all', k === i ? 'w-8 bg-gold' : 'w-3 bg-line hover:bg-faint')} />
        ))}
        <button onClick={() => setAuto((a) => !a)} className="ml-auto cursor-pointer text-xs text-faint transition hover:text-ink">{auto ? 'Pause' : 'Play'}</button>
      </div>
    </div>
  )
}
