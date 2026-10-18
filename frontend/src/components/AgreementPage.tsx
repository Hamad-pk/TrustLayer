import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatEther, type Address } from 'viem'
import { useAccount, useConfig, useReadContract, useReadContracts, useSwitchChain } from 'wagmi'
import { simulateContract } from 'wagmi/actions'
import { sepolia } from 'wagmi/chains'
import { trustLayerAbi, trustLayerAddress } from '../generated'
import { loadSavedTerms, saveTerms, verifyTermsDocument } from '../lib/terms'
import { useTx } from '../lib/useTx'
import WorkPanel from './WorkPanel'
import { Card, Button, Pill, Textarea } from './ui'
import { ExternalLink, ShieldCheck, Copy, Check, Clock3, AlertTriangle, ArrowLeft } from 'lucide-react'
const STATUS=['None','Proposed','Active','Completed','Cancelled']
const PHASE=['Working','Submitted','Revision','Disputed']
const MILESTONE=['Pending','Working','Submitted','Revision','Disputed','Settled','Voided']
const contract=trustLayerAddress[sepolia.id]
const short=(a:string)=>`${a.slice(0,6)}…${a.slice(-4)}`
const when=(s:number)=> s? new Date(s*1000).toLocaleString():'—'
export default function AgreementPage(){
 const { id: idParam }=useParams()
 const config=useConfig()
 const { address, chainId }=useAccount()
 const { mutate: switchChain }=useSwitchChain()
 let id:bigint|null=null
 try{ id=idParam && /^\d+$/.test(idParam)? BigInt(idParam):null }catch{ id=null }
 const { data:a, error, refetch }=useReadContract({ address:contract, abi:trustLayerAbi, functionName:'getAgreement', args:[id??0n], chainId:sepolia.id, query:{ enabled:id!==null, refetchInterval:10000 }})
 const { data:amounts }=useReadContract({ address:contract, abi:trustLayerAbi, functionName:'getMilestoneAmounts', args:[id??0n], chainId:sepolia.id, query:{ enabled:id!==null }})
 const { data:statuses }=useReadContracts({ contracts:(amounts??[]).map((_,i)=>({ address:contract, abi:trustLayerAbi, functionName:'milestoneStatus' as const, args:[id??0n, BigInt(i)] as const, chainId:sepolia.id })), query:{ enabled:id!==null && !!amounts, refetchInterval:10000 }})
 const [docText,setDocText]=useState(()=>(id!==null? loadSavedTerms(sepolia.id,id):''))
 const [copied,setCopied]=useState<string|null>(null)
 const verification=useMemo(()=>{ if(!a || id===null || !docText.trim()) return null; return verifyTermsDocument(docText,{chainId:sepolia.id, contract, id, termsHash:a.termsHash})},[a,id,docText])
 const tx=useTx(()=>{void refetch()})
 if(id===null) return <p className="mt-6 text-sm text-white/60">Invalid agreement number.</p>
 if(error) return <p className="mt-6 text-sm text-red-300">Could not read #{idParam}. May not exist.</p>
 if(!a) return <p className="mt-6 text-sm text-white/60">Loading #{idParam}…</p>
 const me=address?.toLowerCase()
 const is=(x:Address)=> !!me && x.toLowerCase()===me
 const isClient=is(a.client), isFreelancer=is(a.freelancer), isPrimary=is(a.primaryArbiter), isFallback=is(a.fallbackArbiter)
 const isParticipant=isClient||isFreelancer||isPrimary||isFallback
 const allAccepted=a.freelancerAccepted && a.primaryAccepted && a.fallbackAccepted
 const wrongChain=chainId!==sepolia.id
 const proposed=a.status===1
 const termsOk=verification?.ok===true
 const sim=(fn:'acceptAsFreelancer'|'acceptAsArbiter')=>()=>simulateContract(config,{abi:trustLayerAbi,address:contract,functionName:fn,args:[id!, a.termsHash] as const,chainId:sepolia.id,account:address})
 const copy=async(v:string,k:string)=>{await navigator.clipboard.writeText(v); setCopied(k); setTimeout(()=>setCopied(null),1200)}
 return (
 <div className="space-y-6">
 <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4"/> Back</Link>
 {wrongChain && <Card className="p-4 flex items-center justify-between border-amber-500/20 bg-amber-500/10"><span className="text-sm text-amber-200 flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Wrong network</span><Button size="sm" variant="subtle" onClick={()=>switchChain({chainId:sepolia.id})}>Switch to Sepolia</Button></Card>}
 <div className="flex flex-wrap items-center gap-2">
 <span className="font-display text-2xl font-bold text-white">Agreement #{id.toString()}</span>
 <Pill className="bg-white text-slate-900">{STATUS[a.status]??'—'}</Pill>
 {a.status===2 && <Pill className="text-white/70">{PHASE[a.phase]??'—'} · {a.currentIndex+1}/{a.endIndex+1}</Pill>}
 <a href={`https://sepolia.etherscan.io/address/${contract}#readContract`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-300">Etherscan <ExternalLink className="h-3 w-3"/></a>
 </div>
 <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
 <Card className="p-5 sm:p-6">
 <div className="text-xs font-semibold tracking-widest uppercase text-white/40">Overview</div>
 <div className="mt-3 space-y-2 text-sm">
 <div className="flex justify-between gap-4 border-b border-white/10 py-2"><span className="text-white/40">Total</span><span className="font-mono font-semibold text-white">{formatEther(a.total)} ETH</span></div>
 <div className="flex justify-between gap-4 border-b border-white/10 py-2"><span className="text-white/40">Locked</span><span className="font-mono text-white">{formatEther(a.locked)} ETH</span></div>
 <div className="flex justify-between gap-4 py-2"><span className="text-white/40">Deadline</span><span className="flex items-center gap-1.5 text-white"><Clock3 className="h-3.5 w-3.5 text-white/40"/>{when(a.phaseDeadline)}</span></div>
 </div>
 <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
 <Addr label="Client" value={a.client} onCopy={()=>copy(a.client,'c')} copied={copied==='c'} />
 <Addr label="Freelancer" value={a.freelancer} onCopy={()=>copy(a.freelancer,'f')} copied={copied==='f'} />
 <Addr label="Primary" value={a.primaryArbiter} onCopy={()=>copy(a.primaryArbiter,'p')} copied={copied==='p'} />
 <Addr label="Fallback" value={a.fallbackArbiter} onCopy={()=>copy(a.fallbackArbiter,'fb')} copied={copied==='fb'} />
 </div>
 <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
 <div className="flex items-center justify-between text-xs"><span className="text-white/40">Terms hash</span><button onClick={()=>copy(a.termsHash,'h')} className="inline-flex items-center gap-1 text-white/60 hover:text-white">{copied==='h'?<Check className="h-3 w-3"/>:<Copy className="h-3 w-3"/>} copy</button></div>
 <div className="mt-1 break-all font-mono text-xs text-white/70">{a.termsHash}</div>
 </div>
 </Card>
 <Card className="p-5 sm:p-6">
 <div className="text-xs font-semibold tracking-widest uppercase text-white/40">Milestones</div>
 {amounts ? amounts.map((amt,i)=>(
 <div key={i} className={`mt-3 flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${a.currentIndex===i && a.status===2?'border-cyan-400/30 bg-cyan-500/10':'border-white/10 bg-white/[0.03]'}`}>
 <div><div className="font-medium text-white">#{i+1} · {formatEther(amt)} ETH</div><div className="text-xs text-white/50">{MILESTONE[Number(statuses?.[i]?.result ?? 0)]}</div></div>
 {a.currentIndex===i && a.status===2 && <Pill className="bg-cyan-500/20 text-cyan-200 border-cyan-400/20">Current</Pill>}
 </div>
 )): <p className="mt-3 text-sm text-white/40">Loading…</p>}
 <div className="mt-5">
 <div className="text-xs font-semibold tracking-widest uppercase text-white/40">Terms</div>
 <Textarea rows={6} value={docText} onChange={e=>setDocText(e.target.value)} placeholder="Paste terms…" className="mt-2 font-mono text-xs"/>
 <div className="mt-2 flex gap-2"><Button size="sm" variant="subtle" onClick={()=>{ if(id!==null) saveTerms(sepolia.id,id,docText)}}>Save</Button><Button size="sm" variant="ghost" onClick={()=>setDocText('')}>Clear</Button></div>
 {verification && (verification.ok ? <div className="mt-2 flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-xs text-emerald-200"><ShieldCheck className="h-4 w-4"/> Verified.</div> : <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-200">{verification.problems.join(' ')}</div>)}
 </div>
 </Card>
 </div>
 <Card className="p-5 sm:p-6">
 <div className="text-sm font-semibold text-white">Actions</div>
 {!address && <p className="mt-2 text-sm text-white/50">Connect wallet.</p>}
 {address && !isParticipant && <p className="mt-2 text-sm text-white/50">Not a participant.</p>}
 {address && !wrongChain && isParticipant && proposed && (
 <div className="mt-3 flex flex-wrap gap-2">
 {!a.freelancerAccepted && isFreelancer && <Button size="sm" disabled={!termsOk||!!tx.pending} onClick={()=>tx.run('Accept', sim('acceptAsFreelancer'))}>Accept as freelancer</Button>}
 {isPrimary && !a.primaryAccepted && <Button size="sm" disabled={!termsOk||!!tx.pending} onClick={()=>tx.run('Accept', sim('acceptAsArbiter'))}>Accept as primary</Button>}
 {isFallback && !a.fallbackAccepted && <Button size="sm" disabled={!termsOk||!!tx.pending} onClick={()=>tx.run('Accept', sim('acceptAsArbiter'))}>Accept as fallback</Button>}
 {isClient && <Button size="sm" disabled={!allAccepted||!!tx.pending} onClick={()=>tx.run('Fund', ()=>simulateContract(config,{abi:trustLayerAbi,address:contract,functionName:'fund',args:[id!],value:a.total,chainId:sepolia.id,account:address}))}>Fund {formatEther(a.total)} ETH</Button>}
 {isParticipant && <Button size="sm" variant="ghost" disabled={!!tx.pending} onClick={()=>{ if(window.confirm('Cancel?')) void tx.run('Cancel', ()=>simulateContract(config,{abi:trustLayerAbi,address:contract,functionName:'cancelBeforeFunding',args:[id!],chainId:sepolia.id,account:address}))}}>Cancel</Button>}
 </div>
 )}
 {address && !wrongChain && isParticipant && a.status!==1 && (
 <WorkPanel id={id} account={address} tx={tx} roles={{client:isClient, freelancer:isFreelancer, primary:isPrimary, fallback:isFallback}} currentAmount={amounts?.[a.currentIndex]} state={{ status:a.status, phase:a.phase, currentIndex:a.currentIndex, endIndex:a.endIndex, phaseDeadline:a.phaseDeadline, disputeOpenedAt:a.disputeOpenedAt, clientCredit:a.clientCredit, freelancerCredit:a.freelancerCredit }} />
 )}
 {tx.pending && <p className="mt-3 text-sm text-cyan-300">{tx.pending}</p>}
 {tx.error && <p className="mt-3 rounded-xl bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-200">{tx.error}</p>}
 {tx.lastHash && !tx.pending && !tx.error && <a className="mt-2 block text-xs text-cyan-300 underline" target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/tx/${tx.lastHash}`}>View tx</a>}
 </Card>
 </div>
 )
}
function Addr({label,value,onCopy,copied}:{label:string; value:string; onCopy:()=>void; copied:boolean}){
 return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5"><div className="text-[11px] tracking-widest uppercase text-white/40">{label}</div><div className="mt-1 flex items-center gap-2"><span className="font-mono text-xs text-white">{short(value)}</span><button onClick={onCopy} className="grid h-6 w-6 place-items-center rounded-lg bg-white/10 text-white/70 hover:bg-white/15">{copied?<Check className="h-3 w-3"/>:<Copy className="h-3 w-3"/>}</button></div></div>
}

