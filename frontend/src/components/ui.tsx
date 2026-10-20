import * as React from 'react'
import { Check, Copy, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'

/* ---------- surfaces ---------- */
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-line bg-deep', className)} {...p} />
}

/* ---------- buttons ---------- */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}
export function Button({ variant = 'primary', size = 'md', loading, className, disabled, children, ...p }: ButtonProps) {
  const sizes = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-[15px]' }[size]
  const variants = {
    primary: 'bg-gold text-gold-ink font-semibold hover:bg-[#f3c765] shadow-[0_8px_24px_-8px_rgb(234_185_79/0.55)]',
    secondary: 'bg-raise text-ink border border-line hover:border-[#31546a] hover:bg-[#16303f]',
    ghost: 'text-mute hover:text-ink hover:bg-raise',
    danger: 'bg-rose/10 text-rose border border-rose/30 hover:bg-rose/20',
  }[variant]
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-medium transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
        sizes, variants, className,
      )}
      {...p}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

/* ---------- form fields (className is merged, never overwritten) ---------- */
const fieldBase =
  'w-full rounded-xl border border-line bg-abyss/70 px-3.5 text-[15px] text-ink placeholder:text-faint transition hover:border-[#2a4759] focus:border-ice focus:bg-abyss focus:outline-none focus:ring-4 focus:ring-ice/10'
export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, 'h-11', className)} {...p} />
}
export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'py-2.5 leading-relaxed', className)} {...p} />
}
export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-[13px] text-rose">{error}</span> : hint ? <span className="mt-1.5 block text-[13px] text-faint">{hint}</span> : null}
    </label>
  )
}

/* ---------- status ---------- */
type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
const tones: Record<Tone, string> = {
  neutral: 'bg-white/5 text-mute',
  accent: 'bg-ice/12 text-ice',
  info: 'bg-ice/12 text-ice',
  success: 'bg-mint/12 text-mint',
  warning: 'bg-gold/12 text-gold',
  danger: 'bg-rose/12 text-rose',
}
export function Badge({ tone = 'neutral', className, children, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', tones[tone], className)} {...p}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  )
}

/* ---------- feedback ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} />
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <div className="font-display text-lg font-semibold">{title}</div>
      <p className="mx-auto mt-1 max-w-sm text-sm text-mute">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ---------- small interactions ---------- */
export function CopyButton({ value, label = 'Copy', className }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1400) }}
      className={cn('grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-mute transition hover:bg-raise hover:text-ink', className)}
    >
      {done ? <Check className="h-4 w-4 text-mint" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

/** Two-step button for actions that cannot be undone: the first click arms it, the second confirms. */
export function ConfirmButton({ children, confirmLabel = 'Yes, continue', onConfirm, variant = 'secondary', size = 'md', disabled }: {
  children: React.ReactNode; confirmLabel?: string; onConfirm: () => void; variant?: ButtonProps['variant']; size?: ButtonProps['size']; disabled?: boolean
}) {
  const [armed, setArmed] = useState(false)
  const t = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(t.current), [])
  if (!armed) {
    return <Button variant={variant} size={size} disabled={disabled} onClick={() => { setArmed(true); t.current = window.setTimeout(() => setArmed(false), 5000) }}>{children}</Button>
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="danger" size={size} onClick={() => { setArmed(false); onConfirm() }}>{confirmLabel}</Button>
      <Button variant="ghost" size={size} onClick={() => setArmed(false)}>Cancel</Button>
    </span>
  )
}

/** Shows where a transaction is: simulated, waiting for the wallet, or waiting for the chain. */
export function TxProgress({ pending }: { pending: string | null }) {
  if (!pending) return null
  const step = pending.includes('confirm in your wallet') ? 1 : pending.includes('waiting') ? 2 : 0
  const names = ['Checking', 'Confirm in wallet', 'On-chain']
  return (
    <ol className="mt-4 flex items-center gap-2 text-xs" aria-live="polite">
      {names.map((n, i) => (
        <li key={n} className={cn('flex items-center gap-2', i <= step ? 'text-ink' : 'text-faint')}>
          <span className={cn('grid h-5 w-5 place-items-center rounded-full border text-[10px]', i < step ? 'border-mint bg-mint text-abyss' : i === step ? 'border-gold text-gold' : 'border-line')}>
            {i < step ? <Check className="h-3 w-3" /> : i === step ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
          </span>
          {n}
          {i < names.length - 1 && <span className="h-px w-4 bg-line" aria-hidden />}
        </li>
      ))}
    </ol>
  )
}

