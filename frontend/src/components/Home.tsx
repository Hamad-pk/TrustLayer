import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useReadContract, useReadContracts } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { trustLayerAbi, trustLayerAddress } from '../generated'
import AgreementRow, { type Ag } from './AgreementRow'
import Vault from './Vault'
import { Button, Card, Input, Skeleton } from './ui'
import { CountUp } from './FundsBar'
import ProofStrip from './ProofStrip'
import { DEMO_AGREEMENT_ID } from '../lib/site'

const c = trustLayerAddress[sepolia.id]

const STEPS = [
  { who: 'Client and freelancer', what: 'Agree the milestones', text: 'The client sets the amounts. The freelancer and two arbiters accept the exact terms.' },
  { who: 'Client', what: 'Fund the agreement', text: 'The full amount goes into the contract. Neither person can touch it outside the rules.' },
  { who: 'Freelancer', what: 'Deliver, one milestone at a time', text: 'The client approves, asks for changes or disputes. Silence has a deadline.' },
  { who: 'Freelancer', what: 'Withdraw', text: 'Approved money is credited, then withdrawn to any address the freelancer chooses.' },
]
const GUARANTEES = [
  ['No admin key', 'There is no owner, pause switch or upgrade path. Nobody can move the money except by the rules.'],
  ['Losses are bounded', 'A bad ruling costs one milestone. The client can end the agreement after the current one.'],
  ['Every stuck state has a deadline', 'When someone goes silent, anyone can trigger the next step once the time is up.'],
  ['You pull your own money', 'Payments are credited first and withdrawn by their owner, so one failed transfer blocks no one else.'],
]

export default function Home() {
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const [jump, setJump] = useState('')
  const { data: cnt, isLoading: cl } = useReadContract({ address: c, abi: trustLayerAbi, functionName: 'agreementCount', chainId: sepolia.id })
  const n = cnt !== undefined ? Number(cnt) : 0
  const ids = Array.from({ length: Math.min(n, 5) }, (_, i) => n - i)
  const { data: rec, isLoading: rl } = useReadContracts({
    contracts: ids.map((id) => ({ address: c, abi: trustLayerAbi, functionName: 'getAgreement' as const, args: [BigInt(id)] as const, chainId: sepolia.id })),
    query: { enabled: ids.length > 0 },
  })
  const rise = (d: number) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: d, ease: [0.2, 0.7, 0.2, 1] as const } })

  return (
    <div className="space-y-20">
      <section className="grid items-start gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <motion.p {...rise(0)} className="inline-flex items-center gap-2 text-sm text-mute">
            <span className="h-2 w-2 rounded-full bg-mint shadow-[0_0_10px_rgb(70_214_160/0.7)]" /> Live on the Sepolia test network
          </motion.p>
          <motion.h1 {...rise(0.08)} className="mt-5 text-balance text-[40px] font-semibold leading-[1.04] sm:text-5xl lg:text-[60px]">
            Hold the payment until the work is done.
          </motion.h1>
          <motion.p {...rise(0.16)} className="mt-6 max-w-[50ch] text-lg leading-relaxed text-mute">
            TrustLayer keeps a client&rsquo;s ETH in a contract and releases it milestone by milestone. If the two sides disagree, an arbiter they both chose decides. No one holds an admin key.
          </motion.p>
          <motion.div {...rise(0.24)} className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link to="/create"><Button size="lg">Create an agreement <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link to="/agreements"><Button size="lg" variant="secondary">Browse agreements</Button></Link>
            <Link to={`/agreement/${DEMO_AGREEMENT_ID}`} className="group inline-flex items-center gap-1.5 text-[15px] text-mute transition hover:text-ink">See a real, completed agreement <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link>
          </motion.div>
        </div>
        <motion.div {...rise(0.2)}><Vault /></motion.div>
      </section>

      <ProofStrip />

      <Card className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={(e) => { e.preventDefault(); if (/^\d+$/.test(jump)) nav(`/agreement/${jump}`) }}>
          <label htmlFor="jump" className="shrink-0 font-display text-lg font-semibold">Open an agreement</label>
          <Input id="jump" inputMode="numeric" placeholder="Agreement number" value={jump} onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))} className="sm:w-56" />
          <Button type="submit" variant="secondary" disabled={!jump}>Open</Button>
        </form>
        <div className="flex items-baseline gap-3 border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <span className="font-display text-4xl font-semibold tabular">{cl ? '–' : <CountUp value={n} />}</span>
          <span className="text-sm text-mute">agreements<br />on Sepolia</span>
        </div>
      </Card>

      <section>
        <h2 className="text-3xl font-semibold sm:text-4xl">How an agreement works</h2>
        <ol className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.what} className="relative">
              {i < STEPS.length - 1 && <span className="absolute left-12 right-[-2rem] top-[19px] hidden h-px bg-line md:block" aria-hidden />}
              <span className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-deep font-display text-base font-semibold text-gold">{i + 1}</span>
              <p className="mt-5 text-sm text-faint">{s.who}</p>
              <h3 className="mt-0.5 text-lg font-semibold leading-snug">{s.what}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-mute">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <h2 className="text-3xl font-semibold sm:text-4xl">Rules nobody can bend</h2>
          <p className="mt-4 max-w-[40ch] text-mute">Everything here is enforced by the contract and checked by automated tests, including invariants that must hold after any sequence of actions.</p>
          <a href={`https://sepolia.etherscan.io/address/${c}#code`} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-sm text-ice hover:underline">Read the verified source <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
        <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {GUARANTEES.map(([t, d]) => (
            <div key={t} className="border-t border-line pt-5">
              <dt className="font-display text-lg font-semibold">{t}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-mute">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl font-semibold sm:text-4xl">Recent agreements</h2>
          {n > 5 && <Link to="/agreements" className="text-sm text-ice hover:underline">View all {n}</Link>}
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-deep">
          {cl || rl ? (
            <div className="space-y-px p-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[76px]" />)}</div>
          ) : n === 0 ? (
            <div className="px-6 py-12 text-center"><p className="font-display text-lg font-semibold">No agreements yet</p><p className="mt-1 text-sm text-mute">Create the first one on Sepolia.</p></div>
          ) : (
            <div className="divide-y divide-line-soft">
              {ids.map((id, idx) => {
                const row = rec?.[idx]
                return row?.status === 'success' ? <AgreementRow key={id} id={id} a={row.result as unknown as Ag} /> : null
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
