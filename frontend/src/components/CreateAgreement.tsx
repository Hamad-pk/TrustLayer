import { useState } from 'react'
import { formatEther, parseEventLogs, type Hex } from 'viem'
import { useAccount, useConfig, useSwitchChain, useWriteContract } from 'wagmi'
import { simulateContract, waitForTransactionReceipt } from 'wagmi/actions'
import { sepolia } from 'wagmi/chains'
import { trustLayerAbi, trustLayerAddress } from '../generated'
import { MAX_MILESTONES, emptyMilestone, toContractArgs, totalWei, validate, type CreateForm } from '../lib/agreement'
import { describeError } from '../lib/errors'
import { buildTermsDocument, saveTerms } from '../lib/terms'
import { Link } from 'react-router-dom'
import { Card, Button, Input, Textarea, Label, Pill } from './ui'
import { Plus, Trash2, ShieldCheck, Copy, Check, ExternalLink, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react'

type Created = { id: bigint; termsHash: Hex; txHash: Hex; document: string }

export default function CreateAgreement() {
  const config = useConfig()
  const { address, chainId } = useAccount()
  const { mutate: switchChain } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const [form, setForm] = useState<CreateForm>({ freelancer: '', primary: '', fallback: '', milestones: [emptyMilestone()] })
  const [problems, setProblems] = useState<string[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [created, setCreated] = useState<Created | null>(null)
  const [copied, setCopied] = useState(false)
  const busy = status !== null
  const setMilestone = (i: number, patch: Partial<CreateForm['milestones'][number]>) => setForm((f) => ({ ...f, milestones: f.milestones.map((m, k) => (k === i ? { ...m, ...patch } : m)) }))
  async function submit() {
    setCreated(null)
    const errors = validate(form, address)
    setProblems(errors)
    if (errors.length > 0 || !address) return
    const args = toContractArgs(form)
    try {
      setStatus('Checking…')
      const { request } = await simulateContract(config, { abi: trustLayerAbi, address: trustLayerAddress[sepolia.id], functionName: 'create', args: [args.freelancer, args.primary, args.fallback, args.milestones], chainId: sepolia.id, account: address })
      setStatus('Confirm in wallet…')
      const txHash = await writeContractAsync(request)
      setStatus('Confirming…')
      const receipt = await waitForTransactionReceipt(config, { hash: txHash })
      if (receipt.status !== 'success') throw new Error('Transaction failed.')
      const [log] = parseEventLogs({ abi: trustLayerAbi, logs: receipt.logs, eventName: 'AgreementCreated' })
      const document = buildTermsDocument({ chainId: sepolia.id, contract: trustLayerAddress[sepolia.id], id: log.args.id, termsHash: log.args.termsHash, client: address, freelancer: args.freelancer, primary: args.primary, fallback: args.fallback, texts: form.milestones, hashes: args.milestones })
      saveTerms(sepolia.id, log.args.id, document)
      setCreated({ id: log.args.id, termsHash: log.args.termsHash, txHash, document })
    } catch (e) { setProblems([describeError(e)]) } finally { setStatus(null) }
  }
  if (chainId !== sepolia.id) {
    return (<Card className="p-6"><div className="flex items-center gap-2 text-amber-200"><AlertTriangle className="h-4 w-4" /> Wrong network — switch to Sepolia.</div><Button variant="subtle" className="mt-3" onClick={()=>switchChain({chainId:sepolia.id})}>Switch to Sepolia</Button></Card>)
  }
  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><Pill className="text-cyan-200 border-cyan-400/20 bg-cyan-500/10"><Sparkles className="h-3 w-3" /> New agreement</Pill><span className="text-xs text-white/40">You are the client</span></div>
          <h2 className="font-display mt-2 text-xl font-semibold text-white sm:text-2xl">Create agreement</h2>
          <p className="mt-1 max-w-xl text-sm text-white/60">Define roles and milestones. Only hashes go on-chain — keep the full text to share with participants.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> No admin</div>
      </div>
      <Card className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div><Label>Freelancer</Label><Input className="mt-1.5" placeholder="0x…" value={form.freelancer} onChange={e=>setForm({...form, freelancer:e.target.value.trim()})} /></div>
          <div><Label>Primary arbiter</Label><Input className="mt-1.5" placeholder="0x…" value={form.primary} onChange={e=>setForm({...form, primary:e.target.value.trim()})} /></div>
          <div><Label>Fallback arbiter</Label><Input className="mt-1.5" placeholder="0x…" value={form.fallback} onChange={e=>setForm({...form, fallback:e.target.value.trim()})} /></div>
        </div>
        <p className="mt-3 text-xs text-white/40">All four roles must be distinct addresses.</p>
      </Card>
      <div className="grid gap-4">
        {form.milestones.map((m,i)=>(
          <Card key={i} className="p-4 sm:p-5">
            <div className="flex items-center justify-between"><span className="inline-flex h-7 items-center rounded-full bg-white px-3 text-xs font-bold text-slate-900">Milestone {i+1}</span>{form.milestones.length>1 && <button className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-red-300" disabled={busy} onClick={()=>setForm({...form, milestones: form.milestones.filter((_,k)=>k!==i)})}><Trash2 className="h-3.5 w-3.5" /> Remove</button>}</div>
            <div className="mt-3 grid gap-3">
              <div><Label>Deliverable</Label><Textarea rows={2} value={m.description} onChange={e=>setMilestone(i,{description:e.target.value})} placeholder="What will be delivered…" className="mt-1.5" /></div>
              <div><Label>Acceptance criteria</Label><Textarea rows={2} value={m.criteria} onChange={e=>setMilestone(i,{criteria:e.target.value})} placeholder="How acceptance is judged…" className="mt-1.5" /></div>
              <div><Label>Amount (ETH)</Label><Input value={m.amountEth} placeholder="0.01" inputMode="decimal" onChange={e=>setMilestone(i,{amountEth:e.target.value})} className="mt-1.5" /></div>
            </div>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" disabled={busy || form.milestones.length>=MAX_MILESTONES} onClick={()=>setForm({...form, milestones:[...form.milestones, emptyMilestone()]})}><Plus className="h-4 w-4" /> Add milestone</Button>
        <span className="text-sm text-white/60">Total to fund later: <strong className="text-white">{formatEther(totalWei(form))} ETH</strong></span>
        <span className="text-xs text-white/30">({form.milestones.length}/{MAX_MILESTONES})</span>
      </div>
      {problems.length>0 && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4"><div className="flex items-center gap-2 text-sm font-medium text-red-200"><AlertTriangle className="h-4 w-4" /> Fix these</div><ul className="mt-2 list-disc pl-5 text-sm text-red-200/90">{problems.map(p=><li key={p}>{p}</li>)}</ul></div>}
      <Button size="lg" disabled={busy} onClick={submit}>{status ?? <>Create agreement <ArrowRight className="h-4 w-4" /></>}</Button>
      {created && (
        <Card className="overflow-hidden border-emerald-500/20">
          <div className="bg-emerald-500/10 px-5 py-3 flex items-center gap-2 text-sm font-semibold text-emerald-200"><Check className="h-4 w-4" /> Agreement #{created.id.toString()} created</div>
          <div className="p-5 space-y-3">
            <Link className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200" to={`/agreement/${created.id}`}>Open agreement #{created.id.toString()} <ArrowRight className="h-3.5 w-3.5" /></Link>
            <div className="rounded-xl bg-black/30 border border-white/10 p-3 font-mono text-xs break-all text-white/70">Terms hash: {created.termsHash}</div>
            <a className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white" target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/tx/${created.txHash}`}>View on Etherscan <ExternalLink className="h-3 w-3" /></a>
            <p className="text-xs text-white/50">Send this terms document to freelancer + arbiters so they can verify.</p>
            <div className="relative"><textarea readOnly className="h-40 w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs text-white/80" value={created.document} /><button className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-900" onClick={async()=>{await navigator.clipboard.writeText(created.document); setCopied(true); setTimeout(()=>setCopied(false),1200)}}>{copied?<Check className="h-4 w-4" />:<Copy className="h-4 w-4" />}</button></div>
          </div>
        </Card>
      )}
    </section>
  )
}