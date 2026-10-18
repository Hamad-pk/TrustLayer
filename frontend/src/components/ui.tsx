import * as React from 'react'
import { cn } from '../lib/cn'

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl', className)} {...p} />
}
export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 sm:p-6', className)} {...p} />
}
export function Pill({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold tracking-widest uppercase', className)} {...p} />
}
export function Button({ variant='primary', size='md', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'ghost'|'outline'|'subtle', size?: 'sm'|'md'|'lg' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]'
  const sizes = { sm:'h-8 px-3 text-xs', md:'h-10 px-4 text-sm', lg:'h-12 px-6 text-[15px]' }[size]
  const variants = {
    primary: 'bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-white/10',
    ghost: 'bg-white/5 text-white hover:bg-white/10 border border-white/10',
    outline: 'border border-white/15 text-white hover:bg-white/5',
    subtle: 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-white/5',
  }[variant]
  return <button className={cn(base, sizes, variants, className)} {...p} />
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('h-10 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white placeholder:text-white/40 focus:border-cyan-400/50 focus:bg-white/[0.08] focus:outline-none transition', props.className)} {...props} />
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-cyan-400/50 focus:bg-white/[0.08] focus:outline-none transition', props.className)} {...props} />
}
export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-xs font-semibold tracking-wide uppercase text-white/60', className)} {...p} />
}
export function Separator({ className }: { className?: string }) {
  return <div className={cn('h-px bg-white/10', className)} />
}
