import { Link, useLocation } from 'react-router-dom'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, LogOut, Menu, Wallet, X } from 'lucide-react'
import { useState } from 'react'
import { sepolia } from 'wagmi/chains'
import { trustLayerAddress } from '../generated'
import { shortAddr } from '../lib/format'
import { Button, CopyButton } from './ui'
import { cn } from '../lib/cn'

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/agreements', label: 'Agreements' },
  { to: '/create', label: 'Create' },
]
const contractUrl = `https://sepolia.etherscan.io/address/${trustLayerAddress[sepolia.id]}#code`

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="TrustLayer home">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <rect x="1.5" y="1.5" width="17" height="17" rx="5" fill="#6fa8ff" />
        <rect x="9.5" y="9.5" width="17" height="17" rx="5" fill="#46d6a0" fillOpacity="0.92" />
      </svg>
      <span className="font-display text-[19px] font-semibold tracking-tight">TrustLayer</span>
    </Link>
  )
}

export default function Navbar() {
  const { address, isConnected, chainId } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const onSepolia = chainId === sepolia.id
  const active = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to) || (to === '/agreements' && pathname.startsWith('/agreement/')))
  const wallet = connectors[0]

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-abyss/75 glass">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={cn('relative rounded-full px-4 py-2 text-sm font-medium transition', active(n.to) ? 'text-ink' : 'text-mute hover:text-ink')}>
                {active(n.to) && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-raise" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                {n.label}
              </Link>
            ))}
            <a href={contractUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-mute transition hover:text-ink">
              Contract <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isConnected && address ? (
            <>
              <span className={cn('hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium sm:inline-flex', onSepolia ? 'border-mint/30 text-mint' : 'border-gold/40 text-gold')}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />{onSepolia ? 'Sepolia' : `Chain ${chainId}`}
              </span>
              <span className="hidden items-center rounded-full border border-line bg-deep pl-3.5 pr-1 text-sm sm:inline-flex">
                <span className="font-mono text-[13px] tabular">{shortAddr(address)}</span>
                <CopyButton value={address} label="Copy address" className="ml-1 h-7 w-7" />
              </span>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => disconnect()}><LogOut className="h-4 w-4" />Disconnect</Button>
            </>
          ) : (
            wallet && <Button size="sm" loading={isPending} onClick={() => connect({ connector: wallet })}><Wallet className="h-4 w-4" />Connect wallet</Button>
          )}
          <button className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-line text-mute transition hover:text-ink md:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-line-soft md:hidden">
            <div className="flex flex-col gap-1 px-4 py-3">
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className={cn('rounded-xl px-3 py-3 text-[15px] font-medium', active(n.to) ? 'bg-raise text-ink' : 'text-mute')}>{n.label}</Link>
              ))}
              <a href={contractUrl} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-3 text-[15px] text-mute">View contract on Etherscan</a>
              {isConnected && address && (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-line px-3 py-2.5">
                  <span className="font-mono text-sm">{shortAddr(address)}</span>
                  <Button variant="ghost" size="sm" onClick={() => disconnect()}>Disconnect</Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isConnected && !onSepolia && (
        <div className="border-t border-gold/20 bg-gold/10 px-4 py-2.5 text-center text-sm text-gold">Your wallet is on the wrong network. Switch to Sepolia to use TrustLayer.</div>
      )}
    </header>
  )
}
