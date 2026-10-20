import { useEffect, useState } from 'react'
import { formatEther, parseEther, type Address, type PublicClient } from 'viem'
import { useQuery } from '@tanstack/react-query'
import { useConfig } from 'wagmi'
import { simulateContract } from 'wagmi/actions'
import { sepolia } from 'wagmi/chains'
import { Check, ExternalLink, X } from 'lucide-react'
import { trustLayerAbi, trustLayerAddress } from '../generated'
import { isAllowed, type AgreementState, type Roles } from '../lib/actions'
import { hashText } from '../lib/agreement'
import type { useTx } from '../lib/useTx'
import { SEPOLIA_DEPLOY_BLOCK, logsClient } from '../lib/config'
import { fetchSubmissions, latestFor, loadEvidence, saveEvidence } from '../lib/submissions'
import { fmtDeadline } from '../lib/format'
import { Button, ConfirmButton, CopyButton, Field, Input, Textarea } from './ui'

const contract = trustLayerAddress[sepolia.id]
type Props = { id: bigint; account: Address; state: AgreementState; roles: Roles; currentAmount: bigint | undefined; tx: ReturnType<typeof useTx> }

function Block({ title, children }: { title?: string; children: React.ReactNode }) {
  return <div className="border-t border-line-soft pt-5 first:border-0 first:pt-0">{title && <h3 className="mb-3 text-[15px] font-semibold">{title}</h3>}{children}</div>
}

export default function WorkPanel({ id, account, state, roles, currentAmount, tx }: Props) {
  const config = useConfig()
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => { const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15000); return () => clearInterval(t) }, [])
  const [evidence, setEvidence] = useState('')
  const [reason, setReason] = useState('')
  const [toFree, setToFree] = useState('')
  const [withdrawTo, setWithdrawTo] = useState<string>(account)

  const can = (a: Parameters<typeof isAllowed>[0]) => isAllowed(a, state, now, roles)
  const busy = !!tx.pending
  const base = { abi: trustLayerAbi, address: contract, chainId: sepolia.id, account } as const
  const call = <T,>(label: string, f: () => Promise<T & { request: unknown }>) => tx.run(label, f)
  let ruling: bigint | null = null
  try { if (toFree.trim()) ruling = parseEther(toFree.trim()) } catch { ruling = null }
  const valid = ruling !== null && currentAmount !== undefined && ruling >= 0n && ruling <= currentAmount
  const walletOk = /^0x[0-9a-fA-F]{40}$/.test(withdrawTo)
  const anyCredit = (roles.client && state.clientCredit > 0n) || (roles.freelancer && state.freelancerCredit > 0n)
  const myCredit = roles.client ? state.clientCredit : roles.freelancer ? state.freelancerCredit : 0n
  const active = state.status === 2
  const amt = currentAmount !== undefined ? formatEther(currentAmount) : ''
  const idle = !anyCredit && !(['submit', 'approve', 'requestRevision', 'openDispute', 'resolve', 'defaultSplit', 'expire', 'endAfterCurrent'] as const).some(can)

  const note =
    !active ? null
    : state.phase === 0 ? `Waiting for the freelancer to submit. Deadline: ${fmtDeadline(state.phaseDeadline)}.${now >= state.phaseDeadline ? ' It has passed, so anyone can refund the client.' : ''}`
    : state.phase === 1 ? `Submitted. The client\u2019s review window ends ${fmtDeadline(state.phaseDeadline)}.${now >= state.phaseDeadline ? ' It has ended, but the client can still approve until a dispute opens.' : ''}`
    : state.phase === 2 ? `Revision requested. The freelancer must resubmit by ${fmtDeadline(state.phaseDeadline)}.`
    : `In dispute since ${fmtDeadline(state.disputeOpenedAt)}. The primary arbiter has 14 days, then the fallback 14 more, then anyone can settle it 50/50.`

  return (
    <div className="space-y-5">
      {note && <p className="rounded-xl bg-raise px-4 py-3 text-[14px] leading-snug text-mute">{note}</p>}

      {can('submit') && (
        <Block title={state.phase === 2 ? 'Resubmit your work' : 'Submit your work'}>
          <Field label="Evidence" hint="A link or a short description. Only a hash goes on-chain, so send the same text to the client.">
            <Textarea rows={3} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="https://… or what you delivered" />
          </Field>
          <Button className="mt-3" disabled={busy || !evidence.trim()} onClick={() => {
            const cleanEvidence = evidence.trim()
            const evidenceHash = hashText(cleanEvidence)

            saveEvidence(evidenceHash, cleanEvidence)

            void call('Submit', () =>
              simulateContract(config, {
                ...base,
                functionName: 'submit',
                args: [id, evidenceHash],
              }),
            )
          }}>
            {state.phase === 2 ? 'Resubmit work' : 'Submit work'}
          </Button>
        </Block>
      )}

      {(can('approve') || can('requestRevision')) && (
        <Block title="Review the submission">
          {can('approve') && <Button className="w-full" disabled={busy} onClick={() => call('Approve', () => simulateContract(config, { ...base, functionName: 'approve', args: [id] }))}>Approve and release {amt} ETH</Button>}
          {can('requestRevision') && (
            <div className="mt-4">
              <Field label="Or ask for changes" hint="Only a hash of your reason goes on-chain. Tell the freelancer directly.">
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What should change?" />
              </Field>
              <Button variant="secondary" className="mt-3" disabled={busy || !reason.trim()} onClick={() => call('Revision', () => simulateContract(config, { ...base, functionName: 'requestRevision', args: [id, hashText(reason.trim())] }))}>Request a revision</Button>
            </div>
          )}
        </Block>
      )}

      {can('openDispute') && (
        <Block title="Not resolved?">
          <p className="mb-3 text-[14px] text-mute">An arbiter will decide how this milestone is paid. The funds stay frozen until then.</p>
          <ConfirmButton variant="secondary" disabled={busy} confirmLabel="Yes, open dispute" onConfirm={() => void call('Dispute', () => simulateContract(config, { ...base, functionName: 'openDispute', args: [id] }))}>Open a dispute</ConfirmButton>
        </Block>
      )}

      {can('resolve') && (
        <Block title="Your ruling">
          <Field label="Amount to the freelancer (ETH)" hint={`The client receives the rest of ${amt} ETH.`}>
            <Input value={toFree} onChange={(e) => setToFree(e.target.value.trim())} placeholder="0.015" inputMode="decimal" className="tabular" />
          </Field>
          {currentAmount !== undefined && (
            <div className="mt-2 flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setToFree('0')}>All to client</Button>
              <Button variant="ghost" size="sm" onClick={() => setToFree(formatEther(currentAmount / 2n))}>Half</Button>
              <Button variant="ghost" size="sm" onClick={() => setToFree(formatEther(currentAmount))}>All to freelancer</Button>
            </div>
          )}
          {toFree && !valid && <p className="mt-2 text-[13px] text-rose">Enter an amount between 0 and {amt}.</p>}
          <Button className="mt-3" disabled={busy || !valid} onClick={() => call('Ruling', () => simulateContract(config, { ...base, functionName: 'resolve', args: [id, ruling!] }))}>Submit ruling</Button>
        </Block>
      )}

      {(can('defaultSplit') || can('expire')) && (
        <Block title="Deadline passed">
          {can('defaultSplit') && <Button variant="secondary" disabled={busy} onClick={() => call('Settle', () => simulateContract(config, { ...base, functionName: 'defaultSplit', args: [id] }))}>Settle 50/50</Button>}
          {can('expire') && <Button variant="secondary" disabled={busy} onClick={() => call('Refund', () => simulateContract(config, { ...base, functionName: 'expireFreelancerWindow', args: [id] }))}>Refund the client</Button>}
          <p className="mt-2 text-[13px] text-faint">Anyone can trigger this. The outcome is fixed by the rules, not by the caller.</p>
        </Block>
      )}

      {can('endAfterCurrent') && (
        <Block title="Stop after this milestone">
          <p className="mb-3 text-[14px] text-mute">Refunds every later milestone to you now. The current one continues normally.</p>
          <ConfirmButton variant="secondary" disabled={busy} confirmLabel="Yes, refund later milestones" onConfirm={() => void call('End', () => simulateContract(config, { ...base, functionName: 'endAfterCurrent', args: [id] }))}>End after the current milestone</ConfirmButton>
        </Block>
      )}

      {anyCredit && (
        <Block title="Withdraw your funds">
          <div className="font-display text-3xl font-semibold tabular">{formatEther(myCredit)} <span className="text-base font-normal text-faint">ETH</span></div>
          <Field label="Send to" className="mt-3" error={walletOk ? undefined : 'Enter a valid address.'}>
            <Input value={withdrawTo} onChange={(e) => setWithdrawTo(e.target.value.trim())} className="font-mono text-sm" />
          </Field>
          <Button variant="primary" className="mt-3 w-full" disabled={busy || !walletOk} onClick={() => call('Withdraw', () => simulateContract(config, { ...base, functionName: 'withdraw', args: [id, withdrawTo as Address] }))}>Withdraw</Button>
        </Block>
      )}

      {idle && <p className="text-[14px] text-mute">Nothing for you to do right now.</p>}
      {active && <SubmissionBox id={id} idx={state.currentIndex} phase={state.phase} />}
    </div>
  )
}

function SubmissionBox({ id, idx, phase }: { id: bigint; idx: number; phase: number }) {
  const client = logsClient as PublicClient
  const [pasted, setPasted] = useState('')
  const { data: subs, error, isLoading } = useQuery({ queryKey: ['sub', id.toString(), idx, phase], queryFn: () => fetchSubmissions(client, contract, id, SEPOLIA_DEPLOY_BLOCK), refetchInterval: 15000 })
  const sub = subs ? latestFor(subs, idx) : undefined
  const saved = sub ? loadEvidence(sub.evidenceHash) : ''
  const match = !!sub && pasted.trim() !== '' && hashText(pasted) === sub.evidenceHash
  if (!isLoading && !error && !sub) return null
  return (
    <div className="rounded-xl border border-line-soft bg-abyss/50 p-4 text-[14px]">
      <h3 className="font-semibold">Latest submission</h3>
      {isLoading && <p className="mt-2 text-mute">Reading the chain…</p>}
      {error && <p className="mt-2 break-words text-rose">Could not read the history: {(error as Error).message.slice(0, 200)}</p>}
      {sub && (
        <>
          <div className="mt-2 flex items-center gap-1 text-faint"><span className="truncate font-mono text-xs">{sub.evidenceHash}</span><CopyButton value={sub.evidenceHash} label="Copy hash" className="h-7 w-7" /></div>
          <a className="inline-flex items-center gap-1 text-ice hover:underline" target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/tx/${sub.txHash}`}>View the transaction <ExternalLink className="h-3 w-3" /></a>
          {saved && <details className="mt-3"><summary className="cursor-pointer text-mute transition hover:text-ink">Evidence saved in this browser</summary><p className="mt-2 whitespace-pre-wrap rounded-lg bg-deep p-3 text-ink">{saved}</p></details>}
          <Field label="Check evidence you received" className="mt-4" hint="Paste it to confirm it is exactly what was submitted.">
            <Textarea rows={3} value={pasted} onChange={(e) => setPasted(e.target.value)} />
          </Field>
          {pasted.trim() && (match
            ? <p className="mt-2 flex items-center gap-2 rounded-lg bg-mint/10 px-3 py-2 text-mint"><Check className="h-4 w-4" />Matches the submitted hash.</p>
            : <p className="mt-2 flex items-center gap-2 rounded-lg bg-rose/10 px-3 py-2 text-rose"><X className="h-4 w-4" />Does not match. It may be an older or edited version.</p>)}
          {match && <Button variant="ghost" size="sm" className="mt-2" onClick={() => saveEvidence(sub.evidenceHash, pasted.trim())}>Save in this browser</Button>}
        </>
      )}
    </div>
  )
}
