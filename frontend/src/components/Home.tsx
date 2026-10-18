import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAccount, useReadContract } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { motion } from 'framer-motion'
import { trustLayerAbi, trustLayerAddress } from '../generated'
import CreateAgreement from './CreateAgreement'
import { Button, Card, Pill, Input } from './ui'
import { ShieldCheck, Zap, Scale, Wallet, ArrowRight, Search, Layers, Clock3, FileCheck2, Hash, ExternalLink, Sparkles, Timer, Copy, Check, UsersRound } from 'lucide-react'

function Stat({label,value,sub,icon}:{label:string;value:string;sub:string;icon:React.ReactNode}){
 return <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4"><div className="flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-white/40"><span className="grid h-6 w-6 place-items-center rounded-lg bg-white/10 text-white/70">{icon}</span>{label}</div><div className="font-display mt-2 text-lg font-bold text-white sm:text-xl">{value}</div><div className="text-xs text-white/40">{sub}</div></div>
}
export default function Home(){
 const {isConnected}=useAccount()
 const nav=useNavigate()
 const [open,setOpen]=useState('')
 const [copied,setCopied]=useState(false)
 const {data:count,isLoading,error}=useReadContract({address:trustLayerAddress[sepolia.id],abi:trustLayerAbi,functionName:'agreementCount',chainId:sepolia.id})
 const n=count!==undefined?Number(count):0
 const recent=Array.from({length:Math.min(n,12)},(_,i)=>n-i)
 return (
 <div className="space-y-8">
 <motion.section initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.6}} className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent p-6 sm:p-8 lg:p-10">
 <div className="absolute -right-24 -top-24 h-[380px] w-[380px] rounded-full bg-gradient-to-br from-cyan-400/20 via-violet-500/20 to-transparent blur-3xl" />
 <div className="absolute -bottom-24 -left-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-sky-500/10 via-cyan-400/10 to-transparent blur-3xl" />
 <div className="relative">
 <div className="flex flex-wrap items-center gap-2">
 <Pill className="bg-emerald-500/15 text-emerald-300 border-emerald-400/20"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Live on Sepolia</Pill>
 <Pill className="text-white/60"><Hash className="h-3 w-3" /> 0x6A34…9299</Pill>
 <Pill className="text-white/60"><ShieldCheck className="h-3 w-3" /> Verified</Pill>
 <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold tracking-widest uppercase text-slate-900"><Sparkles className="h-3 w-3" /> No admin</span>
 </div>
 <h1 className="font-display mt-5 max-w-3xl text-[30px] font-bold leading-[0.95] tracking-tight text-white sm:text-[42px]">Escrow without trust.<span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent"> Code without compromise.</span></h1>
 <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/60">Milestone-based ETH escrow for client + freelancer with two arbiters. Sequential milestones, bounded loss, deterministic timeouts, pull payments.</p>
 <div className="mt-7 flex flex-wrap gap-3">
 <Button size="lg" onClick={()=>document.getElementById('create')?.scrollIntoView({behavior:'smooth'})}>Create agreement <ArrowRight className="h-4 w-4" /></Button>
 <a href="https://sepolia.etherscan.io/address/0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299#code" target="_blank" rel="noreferrer"><Button variant="ghost" size="lg"><ExternalLink className="h-4 w-4" /> View contract</Button></a>
 </div>
 <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
 <Stat label="Agreements" value={isLoading?'…':error?'—':String(count)} sub="on-chain" icon={<Layers className="h-4 w-4" />} />
 <Stat label="Max milestones" value="20" sub="sequential" icon={<FileCheck2 className="h-4 w-4" />} />
 <Stat label="Policy" value="v1" sub="Cancun" icon={<ShieldCheck className="h-4 w-4" />} />
 <Stat label="Liveness" value="≤ 28 days" sub="disputed → settled" icon={<Timer className="h-4 w-4" />} />
 </div>
 </div>
 </motion.section>
 <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
 <Card className="overflow-hidden">
 <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-900"><Layers className="h-4 w-4" /></div><div><div className="font-display text-sm font-semibold text-white">Agreements</div><div className="text-xs text-white/50">Most recent on Sepolia</div></div></div><span className="hidden sm:inline-flex rounded-full bg-white px-3 py-1 font-mono text-sm font-bold text-slate-900">{isLoading?'…':error?'—':String(count)}</span></div>
 <div className="p-5 sm:p-6">
 {isLoading ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{Array.from({length:6}).map((_,i)=><div key={i} className="h-[64px] animate-pulse rounded-2xl bg-white/5" />)}</div>
 : error ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">Could not read contract.</div>
 : n===0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5"><Sparkles className="h-6 w-6 text-white/60" /></div><div className="mt-3 font-medium text-white">No agreements yet</div><div className="text-sm text-white/50">Be the first to create one.</div></div>
 : <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{recent.map((k)=><Link key={k} to={`/agreement/${k}`} className="group rounded-2xl border border-white/10 bg-white/[0.04] p-3 hover:bg-white/[0.07]"><div className="text-[11px] uppercase text-white/40">Agreement</div><div className="font-display text-xl font-bold text-white">#{k}</div><div className="mt-2 flex items-center gap-1 text-[11px] text-white/60 group-hover:text-white">Open <ArrowRight className="h-3 w-3" /></div></Link>)}</div>}
 <form className="mt-6 flex gap-2" onSubmit={e=>{e.preventDefault(); if(/^\d+$/.test(open)) nav(`/agreement/${open}`)}}><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" /><Input className="pl-9" placeholder="Jump to # … e.g. 42" value={open} onChange={e=>setOpen(e.target.value.trim())} /></div><Button type="submit" variant="subtle">Open</Button></form>
 </div></Card>
 <div className="space-y-6">
 <Card className="p-5 sm:p-6"><div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-white/50"><Clock3 className="h-3.5 w-3.5" /> How it works</div><ol className="mt-4 space-y-3">
 <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-slate-900">1</span><div><div className="text-sm font-semibold text-white">Propose & hash</div><div className="text-xs text-white/60">Only hashes on-chain.</div></div></li>
 <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-slate-900">2</span><div><div className="text-sm font-semibold text-white">Accept & fund</div><div className="text-xs text-white/60">Freelancer + arbiters accept hash.</div></div></li>
 <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-slate-900">3</span><div><div className="text-sm font-semibold text-white">Work & settle</div><div className="text-xs text-white/60">≤28d to settlement.</div></div></li>
 </ol></Card>
 <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div className="text-sm font-semibold text-white">Contract</div><a href="https://sepolia.etherscan.io/address/0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299#code" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-300">Etherscan <ExternalLink className="h-3 w-3" /></a></div><div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex-1 truncate font-mono text-xs text-white/80">0x6A34…9299</div><button onClick={async()=>{await navigator.clipboard.writeText('0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299'); setCopied(true); setTimeout(()=>setCopied(false),1200)}} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-900">{copied?<Check className="h-4 w-4" />:<Copy className="h-4 w-4" />}</button></div></Card>
 </div></div>
 <div><h2 className="font-display text-lg font-semibold text-white">Why TrustLayer feels different</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-500 text-white"><ShieldCheck className="h-5 w-5" /></div><div className="font-display mt-3 text-sm font-semibold text-white">No admin, ever</div><div className="mt-1 text-xs text-white/60">No owner, pause or upgrade. CI enforces.</div></div>
 <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white"><Scale className="h-5 w-5" /></div><div className="font-display mt-3 text-sm font-semibold text-white">Bounded loss</div><div className="mt-1 text-xs text-white/60">One ruling = one milestone.</div></div>
 <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white"><Zap className="h-5 w-5" /></div><div className="font-display mt-3 text-sm font-semibold text-white">Liveness</div><div className="mt-1 text-xs text-white/60">Every state has a deadline.</div></div>
 <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white"><Wallet className="h-5 w-5" /></div><div className="font-display mt-3 text-sm font-semibold text-white">Pull payments</div><div className="mt-1 text-xs text-white/60">Withdraw to any address.</div></div>
 </div><div className="mt-4 grid gap-4 lg:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60"><span className="font-semibold text-white">Accounting:</span> funded = locked + credits + withdrawn.</div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60"><span className="font-semibold text-white">Trust:</span> code enforces rules.</div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm flex items-center gap-3 text-white/60"><UsersRound className="h-5 w-5" /> Distinct roles.</div></div></div>
 <div id="create" className="scroll-mt-24">{isConnected ? <CreateAgreement /> : <Card className="p-6 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-display font-semibold text-white">Ready to create an agreement?</div><div className="text-sm text-white/60">Connect your wallet — you’ll be the client.</div></div><div className="text-sm text-white/40">Header → Connect</div></div></Card>}</div>
 </div>
 )
}
