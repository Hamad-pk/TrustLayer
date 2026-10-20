import { useEffect, useRef, useState } from 'react'
import { animate, motion, useReducedMotion } from 'framer-motion'
import { cn } from '../lib/cn'

export type Parts = { held: number; free: number; client: number; withdrawn: number }

/** ETH amounts trimmed to at most 4 decimals ("0.1", "0.0035", "0"). */
export const fmtN = (n: number) => {
  const s = n.toFixed(4)
  return s.replace(/0+$/, '').replace(/\.$/, '')
}

/** Counts smoothly from the previous value to the new one when the number changes. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    if (reduce) { setShown(value); prev.current = value; return }
    const c = animate(prev.current, value, { duration: 0.7, ease: 'easeOut', onUpdate: setShown })
    prev.current = value
    return () => c.stop()
  }, [value, reduce])
  return <span className={cn('tabular', className)}>{fmtN(shown)}</span>
}

const SEGMENTS = [
  { key: 'held', label: 'Held in escrow', cls: 'bg-ice', dot: 'bg-ice' },
  { key: 'free', label: 'Owed to freelancer', cls: 'bg-mint', dot: 'bg-mint' },
  { key: 'client', label: 'Owed to client', cls: 'bg-coral', dot: 'bg-coral' },
  { key: 'withdrawn', label: 'Withdrawn', cls: 'hatch', dot: 'hatch' },
] as const

/** The one visual that explains the product: where every wei of the agreement currently is. */
export function FundsBar({ parts, total, className }: { parts: Parts; total: number; className?: string }) {
  const reduce = useReducedMotion()
  const pct = (n: number) => (total > 0 ? Math.max(0, Math.min(100, (n / total) * 100)) : 0)
  return (
    <div className={cn('flex h-3.5 w-full overflow-hidden rounded-full bg-raise', className)} role="img"
      aria-label={SEGMENTS.map((s) => `${s.label}: ${fmtN(parts[s.key])} ETH`).join(', ')}>
      {SEGMENTS.map((s) => (
        <motion.div key={s.key} className={cn('h-full', s.cls)} initial={false}
          animate={{ width: `${pct(parts[s.key])}%` }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }} />
      ))}
    </div>
  )
}

export function FundsLegend({ parts, className }: { parts: Parts; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4', className)}>
      {SEGMENTS.map((s) => (
        <div key={s.key}>
          <dt className="flex items-center gap-2 text-[13px] text-mute"><span className={cn('h-2.5 w-2.5 rounded-[3px]', s.dot)} />{s.label}</dt>
          <dd className="mt-1 font-display text-xl font-semibold"><CountUp value={parts[s.key]} /> <span className="text-sm font-normal text-faint">ETH</span></dd>
        </div>
      ))}
    </dl>
  )
}
