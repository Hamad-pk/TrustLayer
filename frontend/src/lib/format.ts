import { formatEther } from 'viem'

export function fmtEth(v: bigint): string {
  const s = formatEther(v)
  // keep 4 decimals max, trim trailing zeros but keep at least 2 for tiny values
  const [intPart, dec=''] = s.split('.')
  if (!dec) return `${intPart}.00`
  const trimmed = dec.slice(0, 6).replace(/0+$/,'')
  if (trimmed.length===0) return `${intPart}.00`
  if (trimmed.length < 2) return `${intPart}.${trimmed.padEnd(2,'0')}`
  return `${intPart}.${trimmed.slice(0,4)}`
}

export function fmtEthFull(v: bigint): string {
  return `${formatEther(v)} ETH`
}

export function shortAddr(a: string): string {
  if (a.length < 10) return a
  return `${a.slice(0,6)}…${a.slice(-4)}`
}

export function fmtTime(ts: number): string {
  if (!ts) return '—'
  return new Date(ts*1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' } as any)
}

export function fmtDeadline(ts: number): string {
  if (!ts) return 'No deadline'
  const d = new Date(ts*1000)
  const now = Date.now()
  const diff = d.getTime() - now
  const abs = Math.abs(diff)
  const days = Math.floor(abs/86400000)
  const hours = Math.floor((abs%86400000)/3600000)
  let rel = ''
  if (days>0) rel = `${days}d ${hours}h`
  else if (hours>0) rel = `${hours}h`
  else rel = `${Math.floor(abs/60000)}m`
  rel = diff>0 ? `in ${rel}` : `${rel} ago`
  return `${d.toLocaleString()} · ${rel}`
}

export const STATUS_LABEL = ['None','Proposed','Active','Completed','Cancelled'] as const
export const PHASE_LABEL = ['Working','Submitted','Revision','Disputed'] as const
export const MILESTONE_LABEL = ['Pending','Working','Submitted','Revision','Disputed','Settled','Voided'] as const

export function statusTone(s: number): 'neutral'|'accent'|'success'|'warning'|'info'|'danger' {
  switch(s){
    case 1: return 'warning'
    case 2: return 'accent'
    case 3: return 'success'
    case 4: return 'neutral'
    default: return 'neutral'
  }
}
export function phaseTone(p: number): 'neutral'|'accent'|'warning'|'info'|'danger' {
  switch(p){
    case 0: return 'neutral'
    case 1: return 'info'
    case 2: return 'warning'
    case 3: return 'danger'
    default: return 'neutral'
  }
}
