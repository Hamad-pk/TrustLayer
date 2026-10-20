import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { formatEther, parseEventLogs, type Hex } from 'viem'
import { useAccount, useConfig, useConnect, useSwitchChain, useWriteContract } from 'wagmi'
import { simulateContract, waitForTransactionReceipt } from 'wagmi/actions'
import { sepolia } from 'wagmi/chains'
import { AlertTriangle, ArrowRight, CheckCircle2, Download, Plus, Trash2, Wallet } from 'lucide-react'
import { trustLayerAbi, trustLayerAddress } from '../generated'
import { MAX_MILESTONES, emptyMilestone, toContractArgs, totalWei, validate, type CreateForm } from '../lib/agreement'
import { describeError } from '../lib/errors'
import { shortAddr } from '../lib/format'
import { buildTermsDocument, saveTerms } from '../lib/terms'
import { Button, Card, CopyButton, Field, Input, Textarea } from './ui'
import { CountUp } from './FundsBar'

type Created = { id: bigint; termsHash: Hex; txHash: Hex; document: string }

export default function CreateAgreement() {
  const config = useConfig()
  const { address, chainId } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { mutate: switchChain } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const [form, setForm] = useState<CreateForm>({ freelancer: '', primary: '', fallback: '', milestones: [emptyMilestone()] })
  const [problems, setProblems] = useState<string[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [created, setCreated] = useState<Created | null>(null)
  const busy = status !== null
  const total = Number(formatEther(totalWei(form)))
  const setMilestone = (i: number, patch: Partial<CreateForm['milestones'][number]>) =>
    setForm((f) => ({ ...f, milestones: f.milestones.map((m, k) => (k === i ? { ...m, ...patch } : m)) }))

  async function submit() {
    setCreated(null)
    const errors = validate(form, address)
    setProblems(errors)
    if (errors.length > 0 || !address) return
    const args = toContractArgs(form)
    try {
      setStatus('Checking…')
      const { request } = await simulateContract(config, { abi: trustLayerAbi, address: trustLayerAddress[sepolia.id], functionName: 'create', args: [args.freelancer, args.primary, args.fallback, args.milestones], chainId: sepolia.id, account: address })
      setStatus('Confirm in your wallet…')
      const txHash = await writeContractAsync(request)
      setStatus('Creating on-chain…')
      const receipt = await waitForTransactionReceipt(config, { hash: txHash })
      if (receipt.status !== 'success') throw new Error('The transaction failed on-chain.')
      const [log] = parseEventLogs({ abi: trustLayerAbi, logs: receipt.logs, eventName: 'AgreementCreated' })
      const document = buildTermsDocument({ chainId: sepolia.id, contract: trustLayerAddress[sepolia.id], id: log.args.id, termsHash: log.args.termsHash, client: address, freelancer: args.freelancer, primary: args.primary, fallback: args.fallback, texts: form.milestones, hashes: args.milestones })
      saveTerms(sepolia.id, log.args.id, document)
      setCreated({ id: log.args.id, termsHash: log.args.termsHash, txHash, document })
    } catch (e) { setProblems([describeError(e)]) } finally { setStatus(null) }
  }

  if (created) {
    const blob = `data:application/json;charset=utf-8,${encodeURIComponent(created.document)}`
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden border-mint/30">
          <div className="flex items-center gap-3 border-b border-mint/20 bg-mint/10 px-6 py-5">
            <CheckCircle2 className="h-6 w-6 text-mint" />
            <div><div className="font-display text-xl font-semibold">Agreement #{created.id.toString()} created</div><div className="text-sm text-mute">One more step before anyone can accept.</div></div>
          </div>
          <div className="space-y-6 p-6">
            <div>
              <h2 className="text-lg font-semibold">Send the terms document to the others</h2>
              <p className="mt-1 text-[15px] text-mute">The contract stores only hashes. The freelancer and both arbiters paste this document into the agreement page to check it matches before they accept. Keep a copy: it cannot be recovered from the chain.</p>
              <div className="relative mt-4">
                <Textarea readOnly value={created.document} className="h-44 font-mono text-xs" />
                <div className="absolute right-2 top-2 flex gap-1 rounded-lg bg-deep/90 p-0.5">
                  <CopyButton value={created.document} label="Copy document" />
                  <a href={blob} download={`trustlayer-agreement-${created.id}.json`} aria-label="Download document" title="Download" className="grid h-8 w-8 place-items-center rounded-lg text-mute transition hover:bg-raise hover:text-ink"><Download className="h-4 w-4" /></a>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-faint"><span>Terms hash</span><span className="truncate font-mono">{created.termsHash}</span><CopyButton value={created.termsHash} label="Copy hash" /></div>
            <div className="flex flex-wrap gap-3">
              <Link to={`/agreement/${created.id}`}><Button size="lg">Open the agreement <ArrowRight className="h-4 w-4" /></Button></Link>
              <a href={`https://sepolia.etherscan.io/tx/${created.txHash}`} target="_blank" rel="noreferrer"><Button size="lg" variant="secondary">View on Etherscan</Button></a>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  if (!address) {
    const w = connectors[0]
    return (
      <Card className="p-8 text-center">
        <Wallet className="mx-auto h-8 w-8 text-gold" />
        <h2 className="mt-4 text-xl font-semibold">Connect your wallet to start</h2>
        <p className="mx-auto mt-1 max-w-sm text-mute">Your wallet becomes the client address. You will confirm one transaction to create the agreement.</p>
        {w && <Button className="mt-6" size="lg" loading={isPending} onClick={() => connect({ connector: w })}>Connect wallet</Button>}
      </Card>
    )
  }
  if (chainId !== sepolia.id) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-gold" />
        <h2 className="mt-4 text-xl font-semibold">Switch to Sepolia</h2>
        <p className="mx-auto mt-1 max-w-sm text-mute">TrustLayer runs on the Sepolia test network. Your wallet is on a different one.</p>
        <Button className="mt-6" size="lg" onClick={() => switchChain({ chainId: sepolia.id })}>Switch network</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-semibold">Who is involved</h2>
        <p className="mt-1 text-mute">All four addresses must be different. You are the client: <span className="font-mono text-sm text-ink">{shortAddr(address)}</span></p>
        <div className="mt-6 grid gap-5">
          <Field label="Freelancer" hint="Gets paid as you approve each milestone."><Input placeholder="0x…" value={form.freelancer} onChange={(e) => setForm({ ...form, freelancer: e.target.value.trim() })} className="font-mono text-sm" /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Primary arbiter" hint="Decides a dispute within 14 days."><Input placeholder="0x…" value={form.primary} onChange={(e) => setForm({ ...form, primary: e.target.value.trim() })} className="font-mono text-sm" /></Field>
            <Field label="Fallback arbiter" hint="Steps in if the primary does not rule."><Input placeholder="0x…" value={form.fallback} onChange={(e) => setForm({ ...form, fallback: e.target.value.trim() })} className="font-mono text-sm" /></Field>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Milestones</h2>
        <p className="mt-1 text-mute">Paid in this order. Only a hash of the text goes on-chain, so keep the wording the way you want it.</p>
        <ol className="mt-6 space-y-4">
          <AnimatePresence initial={false}>
            {form.milestones.map((m, i) => (
              <motion.li key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-raise font-display text-sm font-semibold text-gold">{i + 1}</span><span className="font-display text-lg font-semibold">Milestone {i + 1}</span></div>
                    {form.milestones.length > 1 && <Button variant="ghost" size="sm" disabled={busy} onClick={() => setForm({ ...form, milestones: form.milestones.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" />Remove</Button>}
                  </div>
                  <div className="mt-5 grid gap-5">
                    <Field label="What will be delivered"><Textarea rows={2} value={m.description} onChange={(e) => setMilestone(i, { description: e.target.value })} placeholder="Describe the deliverable so someone who has never met you could check it." /></Field>
                    <Field label="How acceptance is judged"><Textarea rows={2} value={m.criteria} onChange={(e) => setMilestone(i, { criteria: e.target.value })} placeholder="Specific and checkable: pages, sizes, links, revision rounds." /></Field>
                    <Field label="Payment" className="sm:max-w-[220px]">
                      <div className="relative"><Input inputMode="decimal" value={m.amountEth} placeholder="0.01" onChange={(e) => setMilestone(i, { amountEth: e.target.value })} className="pr-14 tabular" /><span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">ETH</span></div>
                    </Field>
                  </div>
                </Card>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        <Button variant="secondary" className="mt-4 w-full border-dashed" disabled={busy || form.milestones.length >= MAX_MILESTONES} onClick={() => setForm({ ...form, milestones: [...form.milestones, emptyMilestone()] })}>
          <Plus className="h-4 w-4" />Add a milestone <span className="text-faint">({form.milestones.length} of {MAX_MILESTONES})</span>
        </Button>
      </section>

      {problems.length > 0 && (
        <div role="alert" className="rounded-2xl border border-rose/30 bg-rose/10 p-5">
          <div className="flex items-center gap-2 font-medium text-rose"><AlertTriangle className="h-4 w-4" />Fix this before creating</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-ink/90">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      <div className="sticky bottom-4 z-10 flex flex-col gap-4 rounded-2xl border border-line bg-raise/95 p-5 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)] glass sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-mute">Total you will fund later</div>
          <div className="font-display text-3xl font-semibold"><CountUp value={total} /> <span className="text-base font-normal text-faint">ETH</span></div>
        </div>
        <Button size="lg" loading={busy} onClick={submit}>{status ?? <>Create agreement <ArrowRight className="h-4 w-4" /></>}</Button>
      </div>
    </div>
  )
}
