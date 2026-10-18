import { useEffect, useState } from 'react'
import { formatEther, parseEther, type Address } from 'viem'
import { useQuery } from '@tanstack/react-query'
import { useConfig } from 'wagmi'
import { simulateContract } from 'wagmi/actions'
import { sepolia } from 'wagmi/chains'
import { trustLayerAbi, trustLayerAddress } from '../generated'
import { isAllowed, type AgreementState, type Roles } from '../lib/actions'
import { hashText } from '../lib/agreement'
import type { useTx } from '../lib/useTx'
import { SEPOLIA_DEPLOY_BLOCK, logsClient } from '../lib/config'
import { fetchSubmissions, latestFor, loadEvidence, saveEvidence } from '../lib/submissions'
import type { PublicClient } from 'viem'
import { Card, Button, Input, Textarea } from './ui'
import { Clock3, ShieldCheck, Send, CheckCircle2, AlertTriangle, Coins, FileText } from 'lucide-react'

const contract = trustLayerAddress[sepolia.id]
const fmt = (s:number)=> new Date(s*1000).toLocaleString()
type Props={ id:bigint; account:Address; state:AgreementState; roles:Roles; currentAmount:bigint|undefined; tx:ReturnType<typeof useTx> }
export default function WorkPanel({ id, account, state, roles, currentAmount, tx }: Props){
 const config=useConfig()
 const [now,setNow]=useState(()=>Math.floor(Date.now()/1000))
 useEffect(()=>{const t=setInterval(()=>setNow(Math.floor(Date.now()/1000)),15000);return()=>clearInterval(t)},[])
 const [evidence,setEvidence]=useState('')
 const [reason,setReason]=useState('')
 const [toFreelancer,setToFreelancer]=useState('')
 const [withdrawTo,setWithdrawTo]=useState<string>(account)
 const can=(a:Parameters<typeof isAllowed>[0])=>isAllowed(a,state,now,roles)
 const busy=!!tx.pending
 const base={abi:trustLayerAbi,address:contract,chainId:sepolia.id,account} as const
 const call=<T,>(label:string,f:()=>Promise<T & {request:unknown}>)=>tx.run(label,f)
 let ruling:bigint|null=null
 try{ if(toFreelancer.trim()) ruling=parseEther(toFreelancer.trim()) }catch{ ruling=null }
 const rulingValid=ruling!==null && currentAmount!==undefined && ruling>=0n && ruling<=currentAmount
 const walletOk=/^0x[0-9a-fA-F]{40}$/.test(withdrawTo)
 const anyCredit=(roles.client && state.clientCredit>0n) || (roles.freelancer && state.freelancerCredit>0n)
 const myCredit=roles.client?state.clientCredit: roles.freelancer? state.freelancerCredit:0n
 const active=state.status===2
 const nothing=!anyCredit && !(['submit','approve','requestRevision','openDispute','resolve','defaultSplit','expire','endAfterCurrent'] as const).some(can)
 return (
 <div className="mt-4 space-y-4">
 {active && state.phase===0 && <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white/60 flex gap-2"><Clock3 className="h-4 w-4 shrink-0"/> Waiting for submit. Deadline {fmt(state.phaseDeadline)}{now>=state.phaseDeadline?' · anyone can refund.':''}</div>}
 {active && state.phase===1 && <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white/60 flex gap-2"><Clock3 className="h-4 w-4 shrink-0"/> Submitted. Review ends {fmt(state.phaseDeadline)}</div>}
 {active && state.phase===2 && <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white/60">Revision — resubmit by {fmt(state.phaseDeadline)}</div>}
 {active && state.phase===3 && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200 flex gap-2"><ShieldCheck className="h-4 w-4"/> Disputed.</div>}
 <Card className="p-4 sm:p-5">
 <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-white/40"><Send className="h-3.5 w-3.5"/> Actions</div>
 <div className="mt-3 flex flex-wrap gap-2">
 {can('submit') && <div className="w-full rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs font-medium text-white">Submit #{state.currentIndex+1}</div><Textarea rows={2} placeholder="Evidence…" value={evidence} onChange={e=>setEvidence(e.target.value)} className="mt-2"/><Button size="sm" className="mt-2" disabled={busy||!evidence.trim()} onClick={()=>call('Submit',()=>simulateContract(config,{...base,functionName:'submit',args:[id, hashText(evidence.trim())]}))}>Submit</Button></div>}
 {can('approve') && <Button size="sm" disabled={busy} onClick={()=>call('Approve',()=>simulateContract(config,{...base,functionName:'approve',args:[id]}))}><CheckCircle2 className="h-4 w-4"/> Approve</Button>}
 {can('requestRevision') && <div className="flex gap-2 w-full sm:w-auto"><Input placeholder="Reason" value={reason} onChange={e=>setReason(e.target.value)} className="flex-1"/><Button size="sm" variant="ghost" disabled={busy||!reason.trim()} onClick={()=>call('Request revision',()=>simulateContract(config,{...base,functionName:'requestRevision',args:[id, hashText(reason.trim())]}))}>Revision</Button></div>}
 {can('openDispute') && <Button size="sm" variant="ghost" disabled={busy} onClick={()=>call('Dispute',()=>simulateContract(config,{...base,functionName:'openDispute',args:[id]}))}><AlertTriangle className="h-4 w-4"/> Dispute</Button>}
  {can('resolve') && <div className="w-full rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-white/60">Ruling: ETH to freelancer</div><div className="mt-2 flex gap-2"><Input placeholder="0.05" value={toFreelancer} onChange={e=>setToFreelancer(e.target.value)}/><Button size="sm" disabled={busy||!rulingValid} onClick={()=>call('Resolve',()=>simulateContract(config,{...base,functionName:'resolve',args:[id, ruling!]}))}>Resolve</Button></div>{currentAmount!==undefined && <div className="mt-1 text-xs text-white/40">Milestone: {formatEther(currentAmount)} ETH</div>}</div>}
 {can('defaultSplit') && <Button size="sm" variant="ghost" disabled={busy} onClick={()=>call('Default',()=>simulateContract(config,{...base,functionName:'defaultSplit',args:[id]}))}>Default split</Button>}
 {can('expire') && <Button size="sm" variant="ghost" disabled={busy} onClick={()=>call('Expire',()=>simulateContract(config,{...base,functionName:'expireFreelancerWindow',args:[id]}))}>Expire</Button>}
 {can('endAfterCurrent') && <Button size="sm" variant="ghost" disabled={busy} onClick={()=>call('End',()=>simulateContract(config,{...base,functionName:'endAfterCurrent',args:[id]}))}>End</Button>}
 </div>
 {anyCredit && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-200"><Coins className="h-4 w-4"/> Credit: {formatEther(myCredit)} ETH</div><div className="mt-2 flex gap-2"><Input value={withdrawTo} onChange={e=>setWithdrawTo(e.target.value.trim())} placeholder="0x…" className="flex-1"/><Button size="sm" disabled={busy||!walletOk} onClick={()=>call('Withdraw',()=>simulateContract(config,{...base,functionName:'withdraw',args:[id, withdrawTo as Address]}))}>Withdraw</Button></div></div>}
 {nothing && <p className="mt-3 text-xs text-white/40">No action available.</p>}
 </Card>
 {active && <SubmissionCard id={id} index={state.currentIndex} phase={state.phase} />}
 </div>
 )
}
function SubmissionCard({ id, index, phase }: { id: bigint; index: number; phase: number }) {
 const client = logsClient as PublicClient
 const [pasted,setPasted]=useState('')
 const { data: subs, error, isLoading } = useQuery({ queryKey: ['sub', id.toString(), index, phase], queryFn: ()=>fetchSubmissions(client, contract, id, SEPOLIA_DEPLOY_BLOCK), refetchInterval: 15000 })
 const sub = subs ? latestFor(subs, index) : undefined
 const saved = sub ? loadEvidence(sub.evidenceHash) : ''
 const matches = !!sub && pasted.trim()!=='' && hashText(pasted)===sub.evidenceHash
 return (
 <Card className="p-4"><div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-white/40"><FileText className="h-3.5 w-3.5"/> Latest submission</div>
 {isLoading && <p className="mt-2 text-xs text-white/40">Reading chain…</p>}
 {error && <p className="mt-2 text-xs text-red-300 break-words">{(error as Error).message.slice(0,240)}</p>}
 {subs && !sub && <p className="mt-2 text-xs text-white/40">No submission yet.</p>}
 {sub && (<><p className="mt-2 break-all text-xs font-mono text-white/60">{sub.evidenceHash}</p><a className="text-xs text-cyan-300 underline" target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/tx/${sub.txHash}`}>View tx</a>{saved && <details className="mt-2"><summary className="cursor-pointer text-xs text-white/70">Saved in browser</summary><p className="mt-1 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-2 text-xs text-white/70">{saved}</p></details>}<div className="mt-3"><p className="text-xs text-white/50">Paste evidence to verify:</p><Textarea rows={3} value={pasted} onChange={e=>setPasted(e.target.value)} className="mt-1"/>{pasted.trim() && matches && <p className="mt-1 rounded-xl bg-emerald-500/15 border border-emerald-500/20 p-2 text-xs text-emerald-200">✓ Matches.</p>}{pasted.trim() && !matches && <p className="mt-1 rounded-xl bg-red-500/15 border border-red-500/20 p-2 text-xs text-red-200">No match.</p>}{matches && <Button size="sm" variant="subtle" className="mt-1" onClick={()=>saveEvidence(sub.evidenceHash, pasted.trim())}>Save</Button>}</div></>)}
 </Card>
 )
}
