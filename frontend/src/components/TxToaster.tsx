import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, ExternalLink, X } from 'lucide-react'

type Toast = { id: number; title: string; detail?: string; href?: string; tone: 'info' | 'success' | 'error' }

let pushF: ((t: Omit<Toast, 'id'>) => void) | null = null
export function pushToast(t: Omit<Toast, 'id'>) { pushF?.(t) }

export default function TxToaster() {
  const [items, setItems] = useState<Toast[]>([])
  useEffect(() => {
    pushF = (t) => {
      const id = Date.now() + Math.random()
      setItems((s) => [...s, { ...t, id }])
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), t.tone === 'error' ? 8000 : 5500)
    }
    return () => { pushF = null }
  }, [])
  const dismiss = (id: number) => setItems((s) => s.filter((x) => x.id !== id))

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 24 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="pointer-events-auto flex w-full max-w-[400px] items-start gap-3 rounded-2xl border border-line bg-raise p-4 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)]">
            {t.tone === 'error' ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mint" />}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{t.title}</div>
              {t.detail && <div className="mt-0.5 break-words text-[13px] leading-snug text-mute">{t.detail}</div>}
              {t.href && <a href={t.href} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[13px] text-ice hover:underline">View on Etherscan <ExternalLink className="h-3 w-3" /></a>}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="cursor-pointer text-faint transition hover:text-ink"><X className="h-4 w-4" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
