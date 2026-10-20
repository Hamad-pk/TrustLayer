import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatEther, type Address } from 'viem'
import { useAccount, useConfig, useConnect, useReadContract, useReadContracts, useSwitchChain } from 'wagmi'
import { simulateContract } from 'wagmi/actions'
import { sepolia } from 'wagmi/chains'
import { ArrowLeft, Check, ExternalLink, ShieldCheck, ShieldAlert } from 'lucide-react'
import { trustLayerAbi, trustLayerAddress } from '../generated'
import { loadSavedTerms, saveTerms, verifyTermsDocument } from '../lib/terms'
import { useTx } from '../lib/useTx'
import { fmtDeadline, shortAddr } from '../lib/format'
import { cn } from '../lib/cn'
import WorkPanel from './WorkPanel'
import { Badge, Button, Card, CopyButton, Skeleton, Textarea, TxProgress } from './ui'
import { FundsBar, FundsLegend, type Parts } from './FundsBar'
import { describe, type Ag } from './AgreementRow'

const MILESTONE = ['Pending', 'Working', 'Submitted', 'Revision requested', 'In dispute', 'Settled', 'Voided'] as const
const c = trustLayerAddress[sepolia.id]
const eth = (v: bigint) => Number(formatEther(v))

export default function AgreementPage() {
  const { id: idParam } = useParams()
  const config = useConfig()
  const { address, chainId } = useAccount()
  const { connectors, connect } = useConnect()
  const { mutate: switchChain } = useSwitchChain()
  let id: bigint | null = null
  try { id = idParam && /^\d+$/.test(idParam) ? BigInt(idParam) : null } catch { id = null }

  const { data: a, error, isLoading, refetch } = useReadContract({ address: c, abi: trustLayerAbi, functionName: 'getAgreement', args: [id ?? 0n], chainId: sepolia.id, query: { enabled: id !== null, refetchInterval: 10000 } })
  const { data: amounts } = useReadContract({ address: c, abi: trustLayerAbi, functionName: 'getMilestoneAmounts', args: [id ?? 0n], chainId: sepolia.id, query: { enabled: id !== null } })
  const { data: statuses } = useReadContracts({
    contracts: (amounts ?? []).map((_, i) => ({ address: c, abi: trustLayerAbi, functionName: 'milestoneStatus' as const, args: [id ?? 0n, BigInt(i)] as const, chainId: sepolia.id })),
    query: { enabled: id !== null && !!amounts, refetchInterval: 8000 },
  })
  const [docText, setDocText] = useState(() => (id !== null ? loadSavedTerms(sepolia.id, id) : ''))
  const [showTerms, setShowTerms] = useState(false)
  const v = useMemo(() => {
    if (!a || id === null || !docText.trim()) return null
    return verifyTermsDocument(docText, { chainId: sepolia.id, contract: c, id, termsHash: a.termsHash })
  }, [a, id, docText])
  const tx = useTx(() => { void refetch() })

  if (id === null) return <div className="mx-auto max-w-md py-20 text-center"><h1 className="text-2xl font-semibold">That is not an agreement number</h1><Link to="/agreements" className="mt-6 inline-block"><Button variant="secondary">Browse agreements</Button></Link></div>
  if (error) return <div className="mx-auto max-w-md py-20 text-center"><h1 className="text-2xl font-semibold">Agreement #{idParam} was not found</h1><p className="mt-2 text-mute">It may not exist yet, or the network could not be reached.</p><Link to="/agreements" className="mt-6 inline-block"><Button variant="secondary">Browse agreements</Button></Link></div>
  if (isLoading || !a) return <div className="space-y-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-44" /><Skeleton className="h-80" /></div>

  const me = address?.toLowerCase()
  const is = (x: Address) => !!me && x.toLowerCase() === me
  const isClient = is(a.client), isFree = is(a.freelancer), isPrim = is(a.primaryArbiter), isFall = is(a.fallbackArbiter)
  const isPart = isClient || isFree || isPrim || isFall
  const allOk = a.freelancerAccepted && a.primaryAccepted && a.fallbackAccepted
  const wrong = chainId !== sepolia.id
  const termsOk = v?.ok === true
  const d = describe(a as unknown as Ag)
  const proposed = a.status === 1
  const sim = (fn: 'acceptAsFreelancer' | 'acceptAsArbiter') => () =>
    simulateContract(config, { abi: trustLayerAbi, address: c, functionName: fn, args: [id!, v?.ok ? v.computedHash : a.termsHash] as const, chainId: sepolia.id, account: address })

  // The accounting identity made visible: funded = held + owed + withdrawn
  const funded = proposed || (a.status === 4 && a.currentIndex === 0) ? 0n : a.total
  const withdrawn = funded > a.locked + a.clientCredit + a.freelancerCredit ? funded - a.locked - a.clientCredit - a.freelancerCredit : 0n
  const parts: Parts = { held: eth(a.locked), free: eth(a.freelancerCredit), client: eth(a.clientCredit), withdrawn: eth(withdrawn) }

  const waiting = [!a.freelancerAccepted && 'the freelancer', !a.primaryAccepted && 'the primary arbiter', !a.fallbackAccepted && 'the fallback arbiter'].filter(Boolean) as string[]
  const summary = proposed ? (allOk ? 'Everyone has accepted. The client can fund it now.' : `Waiting for ${waiting.join(', ')} to accept.`)
    : a.status === 2 ? `Milestone ${a.currentIndex + 1} of ${a.endIndex + 1}: ${d.sub.split(': ')[1]}.`
    : a.status === 3 ? 'Every milestone is settled. Anything credited can still be withdrawn.' : 'This agreement ended early. Anything credited can still be withdrawn.'
  const roleLine = isClient ? 'You are the client' : isFree ? 'You are the freelancer' : isPrim ? 'You are the primary arbiter' : isFall ? 'You are the fallback arbiter' : null
  const people: { role: string; addr: Address; mine: boolean; ok?: boolean }[] = [
    { role: 'Client', addr: a.client, mine: isClient },
    { role: 'Freelancer', addr: a.freelancer, mine: isFree, ok: a.freelancerAccepted },
    { role: 'Primary arbiter', addr: a.primaryArbiter, mine: isPrim, ok: a.primaryAccepted },
    { role: 'Fallback arbiter', addr: a.fallbackArbiter, mine: isFall, ok: a.fallbackAccepted },
  ]

  return (
    <div>
      <Link to="/agreements" className="inline-flex items-center gap-1.5 text-sm text-mute transition hover:text-ink"><ArrowLeft className="h-4 w-4" />All agreements</Link>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-4xl font-semibold sm:text-5xl">Agreement #{id.toString()}</h1>
        <Badge tone={d.tone}>{d.label}</Badge>
      </div>
      <p className="mt-3 max-w-[60ch] text-lg text-mute">{summary}</p>
      {a.status === 2 && a.phase !== 3 && a.phaseDeadline > 0 && <p className="mt-1 text-sm text-faint">Deadline for this step: {fmtDeadline(Number(a.phaseDeadline))}</p>}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px] lg:items-start">
        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-semibold">Where the money is</h2>
            <Card className="mt-4 p-5 sm:p-6">
              <div className="flex items-baseline justify-between"><span className="font-display text-4xl font-semibold tabular">{formatEther(a.total)} <span className="text-lg font-normal text-faint">ETH</span></span><span className="text-sm text-mute">{a.count} milestones</span></div>
              <FundsBar parts={parts} total={eth(funded)} className="mt-5" />
              <FundsLegend parts={parts} className="mt-5" />
              <p className="mt-5 border-t border-line-soft pt-4 text-[13px] text-faint">{funded > 0n ? 'These four always add up to the funded total. The contract\u2019s tests check this after every action.' : 'Not funded yet. The full amount is held once the client funds it.'}</p>
            </Card>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Milestones</h2>
            <ol className="mt-5">
              {(amounts ?? []).map((amt, i) => {
                const st = statuses?.[i]?.result as number | undefined
                const m = v?.ok ? v.doc.milestones[i] : null
                const node = st === 5 ? 'border-mint bg-mint text-abyss' : st === 4 ? 'border-rose text-rose' : st !== undefined && st >= 1 && st <= 3 ? 'border-ice text-ice ring-4 ring-ice/15' : 'border-line text-faint'
                return (
                  <li key={i} className="relative pb-7 pl-12 last:pb-0">
                    {i < (amounts?.length ?? 0) - 1 && <span className="absolute bottom-0 left-[15px] top-8 w-px bg-line" aria-hidden />}
                    <span className={cn('absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full border bg-deep text-sm font-semibold', node)}>{st === 5 ? <Check className="h-4 w-4" /> : i + 1}</span>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <span className={cn('font-medium', st === 6 && 'text-faint line-through')}>Milestone {i + 1}</span>
                      <span className="text-sm text-mute"><span className="tabular text-ink">{formatEther(amt)} ETH</span> · {st !== undefined ? MILESTONE[st] : '…'}</span>
                    </div>
                    {m && <div className="mt-2 max-w-prose text-[15px] leading-relaxed"><p>{m.description}</p><p className="mt-1 text-mute">Accepted when: {m.acceptanceCriteria}</p></div>}
                  </li>
                )
              })}
            </ol>
            {!v?.ok && <p className="mt-4 text-sm text-faint">Check the terms below to read what each milestone requires.</p>}
          </section>

          <section>
            <h2 className="text-xl font-semibold">People</h2>
            <ul className="mt-4 divide-y divide-line-soft rounded-2xl border border-line bg-deep">
              {people.map((p) => (
                <li key={p.role} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-2.5"><span className="text-[15px]">{p.role}</span>{p.mine && <Badge tone="accent">You</Badge>}</div>
                  <div className="flex items-center gap-2">
                    {proposed && p.ok !== undefined && <Badge tone={p.ok ? 'success' : 'warning'}>{p.ok ? 'Accepted' : 'Not yet'}</Badge>}
                    <span className="font-mono text-[13px] tabular text-mute">{shortAddr(p.addr)}</span>
                    <CopyButton value={p.addr} label="Copy address" />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Check the terms</h2>
              {!proposed && <Button variant="ghost" size="sm" onClick={() => setShowTerms((s) => !s)}>{showTerms || v ? 'Hide' : 'Show'}</Button>}
            </div>
            {(proposed || showTerms || v) && (
              <div className="mt-4">
                <p className="max-w-prose text-[15px] text-mute">Paste the terms document you were sent. The app rebuilds the hash from its text and compares it with the one stored on-chain.{proposed && ' Accept only if it matches.'}</p>
                <Textarea rows={5} value={docText} placeholder="Paste the terms document (JSON)" className="mt-3 font-mono text-xs"
                  onChange={(e) => { setDocText(e.target.value); if (id !== null) saveTerms(sepolia.id, id, e.target.value) }} />
                {v && (v.ok
                  ? <p className="mt-3 flex items-center gap-2 rounded-xl bg-mint/10 px-4 py-3 text-mint"><ShieldCheck className="h-5 w-5" />These terms exactly match what is committed on-chain.</p>
                  : <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose/10 px-4 py-3 text-rose"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />{v.problems.join(' ')}</p>)}
                <div className="mt-4 flex items-center gap-2 text-[13px] text-faint"><span>Terms hash</span><span className="truncate font-mono">{a.termsHash}</span><CopyButton value={a.termsHash} label="Copy hash" /></div>
              </div>
            )}
            <a href={`https://sepolia.etherscan.io/address/${c}#code`} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm text-ice hover:underline">Verified contract on Etherscan <ExternalLink className="h-3.5 w-3.5" /></a>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card className="border-line p-5 sm:p-6">
            <h2 className="text-xl font-semibold">Your move</h2>
            {roleLine && <p className="mt-1 text-sm text-mute">{roleLine}</p>}
            <div className="mt-5">
              {!address && <><p className="text-mute">Connect your wallet to act on this agreement.</p>{connectors[0] && <Button className="mt-4" onClick={() => connect({ connector: connectors[0] })}>Connect wallet</Button>}</>}
              {address && wrong && <><p className="text-mute">Your wallet is on the wrong network.</p><Button className="mt-4" onClick={() => switchChain({ chainId: sepolia.id })}>Switch to Sepolia</Button></>}
              {address && !wrong && !isPart && <p className="text-mute">You are not part of this agreement, so you can read it but not act on it.</p>}

              {address && !wrong && isPart && proposed && (
                <div className="space-y-3">
                  {isFree && !a.freelancerAccepted && <Button className="w-full" disabled={!termsOk || !!tx.pending} onClick={() => tx.run('Accept', sim('acceptAsFreelancer'))}>Accept as freelancer</Button>}
                  {isPrim && !a.primaryAccepted && <Button className="w-full" disabled={!termsOk || !!tx.pending} onClick={() => tx.run('Accept', sim('acceptAsArbiter'))}>Accept as primary arbiter</Button>}
                  {isFall && !a.fallbackAccepted && <Button className="w-full" disabled={!termsOk || !!tx.pending} onClick={() => tx.run('Accept', sim('acceptAsArbiter'))}>Accept as fallback arbiter</Button>}
                  {(isFree || isPrim || isFall) && !termsOk && !(isFree && a.freelancerAccepted) && !(isPrim && a.primaryAccepted) && !(isFall && a.fallbackAccepted) && <p className="text-[13px] text-faint">Check the terms on the left first. Accepting unlocks when they match.</p>}
                  {isClient && <Button className="w-full" variant={allOk ? 'primary' : 'secondary'} disabled={!allOk || !!tx.pending} onClick={() => tx.run('Fund', () => simulateContract(config, { abi: trustLayerAbi, address: c, functionName: 'fund', args: [id!], value: a.total, chainId: sepolia.id, account: address }))}>Fund {formatEther(a.total)} ETH</Button>}
                  {isClient && !allOk && <p className="text-[13px] text-faint">Funding unlocks when the freelancer and both arbiters have accepted.</p>}
                  {((isFree && a.freelancerAccepted) || (isPrim && a.primaryAccepted) || (isFall && a.fallbackAccepted)) && !isClient && <p className="text-[14px] text-mint">You have accepted. Waiting for the others.</p>}
                  <ConfirmCancel disabled={!!tx.pending} onConfirm={() => void tx.run('Cancel', () => simulateContract(config, { abi: trustLayerAbi, address: c, functionName: 'cancelBeforeFunding', args: [id!], chainId: sepolia.id, account: address }))} />
                </div>
              )}

              {address && !wrong && isPart && !proposed && (
                <WorkPanel id={id} account={address} tx={tx} roles={{ client: isClient, freelancer: isFree, primary: isPrim, fallback: isFall }}
                  currentAmount={amounts?.[Number(a.currentIndex)] as bigint | undefined}
                  state={{ status: a.status, phase: a.phase, currentIndex: Number(a.currentIndex), endIndex: Number(a.endIndex), phaseDeadline: Number(a.phaseDeadline), disputeOpenedAt: Number(a.disputeOpenedAt), clientCredit: a.clientCredit as bigint, freelancerCredit: a.freelancerCredit as bigint }} />
              )}
            </div>
            <TxProgress pending={tx.pending} />
            {tx.error && !tx.pending && <p role="alert" className="mt-4 rounded-xl bg-rose/10 px-4 py-3 text-[14px] text-rose">{tx.error}</p>}
            {tx.lastHash && !tx.pending && !tx.error && <a className="mt-4 inline-flex items-center gap-1 text-[13px] text-ice hover:underline" target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/tx/${tx.lastHash}`}>View the last transaction <ExternalLink className="h-3 w-3" /></a>}
          </Card>
        </aside>
      </div>
    </div>
  )
}

function ConfirmCancel({ onConfirm, disabled }: { onConfirm: () => void; disabled: boolean }) {
  const [armed, setArmed] = useState(false)
  return armed
    ? <div className="flex items-center gap-2 border-t border-line-soft pt-4"><Button variant="danger" size="sm" onClick={() => { setArmed(false); onConfirm() }}>Yes, cancel it</Button><Button variant="ghost" size="sm" onClick={() => setArmed(false)}>Keep it</Button></div>
    : <div className="border-t border-line-soft pt-4"><Button variant="ghost" size="sm" disabled={disabled} onClick={() => setArmed(true)}>Cancel this agreement</Button></div>
}
