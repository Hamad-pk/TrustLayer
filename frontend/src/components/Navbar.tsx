import { Link, useLocation } from 'react-router-dom'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Layers, ExternalLink, LogOut, Wallet, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Pill } from './ui'

function short(a: string){ return `${a.slice(0,6)}…${a.slice(-4)}` }

export default function Navbar(){
  const { address, isConnected, chainId } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [copied, setCopied] = useState(false)
  const loc = useLocation()
  const onSepolia = chainId===11155111

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070b18]/70 glass">
      <div className="mx-auto flex h-[64px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div className="leading-none">
            <div className="font-display text-[17px] font-bold tracking-tight text-white">TrustLayer</div>
            <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/50">Milestone Escrow</div>
          </div>
        </Link>

        <div className="hidden items-center gap-2 sm:flex">
          <Link to="/" className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${loc.pathname==='/'?'bg-white text-slate-900':'text-white/70 hover:text-white hover:bg-white/10'}`}>Overview</Link>
          <a href="https://sepolia.etherscan.io/address/0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299#code" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10">
            Etherscan <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {!isConnected ? (
          <div className="flex items-center gap-2">
            {connectors.map(c=>(
              <Button key={c.uid} onClick={()=>connect({connector:c})} disabled={isPending} size="sm">
                <Wallet className="h-4 w-4" /> Connect
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 sm:flex">
              <span className={`h-2 w-2 rounded-full ${onSepolia?'bg-emerald-400 shadow shadow-emerald-400/50':'bg-amber-400'}`} />
              <span className="font-mono text-xs text-white/90">{short(address!)}</span>
              <button
                onClick={async()=>{ await navigator.clipboard.writeText(address!); setCopied(true); setTimeout(()=>setCopied(false),1200)}}
                className="ml-1 grid h-6 w-6 place-items-center rounded-full hover:bg-white/10"
              >{copied ? <Check className="h-3.5 w-3.5 text-emerald-400"/> : <Copy className="h-3.5 w-3.5 text-white/60"/>}</button>
            </div>
            <Pill className={onSepolia ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300' : 'border-amber-400/30 bg-amber-500/15 text-amber-300'}>
              {onSepolia ? 'Sepolia' : `Chain ${chainId}`}
            </Pill>
            <Button variant="ghost" size="sm" onClick={()=>disconnect()}><LogOut className="h-4 w-4"/> <span className="hidden sm:inline">Disconnect</span></Button>
          </div>
        )}
      </div>
      {/* global status line */}
      <AnimatePresence>
        {isConnected && !onSepolia && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="border-t border-amber-500/20 bg-amber-500/10 text-center text-xs font-medium text-amber-200 py-2 px-4">
            Your wallet is on the wrong network. Switch to Sepolia to interact with TrustLayer.
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
