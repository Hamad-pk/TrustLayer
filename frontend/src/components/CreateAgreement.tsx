import { useState } from 'react'
import { formatEther, parseEventLogs, type Hex } from 'viem'
import { useAccount, useConfig, useSwitchChain, useWriteContract } from 'wagmi'
import { simulateContract, waitForTransactionReceipt } from 'wagmi/actions'
import { sepolia } from 'wagmi/chains'
import { trustLayerAbi, trustLayerAddress } from '../generated'
import {
  MAX_MILESTONES,
  emptyMilestone,
  toContractArgs,
  totalWei,
  validate,
  type CreateForm,
} from '../lib/agreement'
import { describeError } from '../lib/errors'

type Created = { id: bigint; termsHash: Hex; txHash: Hex; document: string }

const inputClass = 'w-full rounded border px-2 py-1 text-sm'

export default function CreateAgreement() {
  const config = useConfig()
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  const [form, setForm] = useState<CreateForm>({
    freelancer: '',
    primary: '',
    fallback: '',
    milestones: [emptyMilestone()],
  })
  const [problems, setProblems] = useState<string[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [created, setCreated] = useState<Created | null>(null)

  const busy = status !== null
  const setMilestone = (i: number, patch: Partial<CreateForm['milestones'][number]>) =>
    setForm((f) => ({ ...f, milestones: f.milestones.map((m, k) => (k === i ? { ...m, ...patch } : m)) }))

  async function submit() {
    setCreated(null)
    const errors = validate(form, address)
    setProblems(errors)
    if (errors.length > 0 || !address) return

    const args = toContractArgs(form)
    try {
      setStatus('Checking the transaction…')
      const { request } = await simulateContract(config, {
        abi: trustLayerAbi,
        address: trustLayerAddress[sepolia.id],
        functionName: 'create',
        args: [args.freelancer, args.primary, args.fallback, args.milestones],
        chainId: sepolia.id,
        account: address,
      })
      setStatus('Confirm in your wallet…')
      const txHash = await writeContractAsync(request)
      setStatus('Waiting for confirmation…')
      const receipt = await waitForTransactionReceipt(config, { hash: txHash })
      if (receipt.status !== 'success') throw new Error('The transaction failed on-chain.')

      const [log] = parseEventLogs({ abi: trustLayerAbi, logs: receipt.logs, eventName: 'AgreementCreated' })
      const document = JSON.stringify(
        {
          note: 'Share this with the freelancer and arbiters. Each hash is keccak256 of the UTF-8 text after trimming whitespace.',
          chainId: sepolia.id,
          contract: trustLayerAddress[sepolia.id],
          agreementId: log.args.id.toString(),
          termsHash: log.args.termsHash,
          client: address,
          freelancer: args.freelancer,
          primaryArbiter: args.primary,
          fallbackArbiter: args.fallback,
          milestones: form.milestones.map((m, i) => ({
            description: m.description.trim(),
            acceptanceCriteria: m.criteria.trim(),
            amountEth: m.amountEth.trim(),
            deliverableHash: args.milestones[i].deliverableHash,
            criteriaHash: args.milestones[i].criteriaHash,
          })),
        },
        null,
        2,
      )
      setCreated({ id: log.args.id, termsHash: log.args.termsHash, txHash, document })
    } catch (e) {
      setProblems([describeError(e)])
    } finally {
      setStatus(null)
    }
  }

  if (chainId !== sepolia.id) {
    return (
      <section className="mt-4 rounded-lg border p-4 text-sm">
        <p>Your wallet is on the wrong network.</p>
        <button
          className="mt-2 rounded bg-black px-3 py-1 text-white"
          onClick={() => switchChain({ chainId: sepolia.id })}
        >
          Switch to Sepolia
        </button>
      </section>
    )
  }

  return (
    <section className="mt-4 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Create an agreement</h2>
      <p className="mt-1 text-xs text-gray-500">
        You are the client. Terms cannot be changed after creation. Nothing is paid until you fund it later.
      </p>

      <div className="mt-4 grid gap-3">
        <label className="text-sm">
          Freelancer address
          <input className={inputClass} value={form.freelancer} placeholder="0x…"
            onChange={(e) => setForm({ ...form, freelancer: e.target.value.trim() })} />
        </label>
        <label className="text-sm">
          Primary arbiter address
          <input className={inputClass} value={form.primary} placeholder="0x…"
            onChange={(e) => setForm({ ...form, primary: e.target.value.trim() })} />
        </label>
        <label className="text-sm">
          Fallback arbiter address
          <input className={inputClass} value={form.fallback} placeholder="0x…"
            onChange={(e) => setForm({ ...form, fallback: e.target.value.trim() })} />
        </label>
      </div>

      <h3 className="mt-5 text-sm font-semibold">Milestones (paid in order)</h3>
      {form.milestones.map((m, i) => (
        <div key={i} className="mt-2 rounded border p-3">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Milestone {i + 1}</span>
            {form.milestones.length > 1 && (
              <button className="text-xs text-red-600" disabled={busy}
                onClick={() => setForm({ ...form, milestones: form.milestones.filter((_, k) => k !== i) })}>
                Remove
              </button>
            )}
          </div>
          <label className="mt-2 block text-xs">
            Deliverable
            <textarea className={inputClass} rows={2} value={m.description}
              onChange={(e) => setMilestone(i, { description: e.target.value })} />
          </label>
          <label className="mt-2 block text-xs">
            Acceptance criteria
            <textarea className={inputClass} rows={2} value={m.criteria}
              onChange={(e) => setMilestone(i, { criteria: e.target.value })} />
          </label>
          <label className="mt-2 block text-xs">
            Amount (ETH)
            <input className={inputClass} inputMode="decimal" value={m.amountEth} placeholder="0.01"
              onChange={(e) => setMilestone(i, { amountEth: e.target.value })} />
          </label>
        </div>
      ))}

      <button
        className="mt-3 rounded bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
        disabled={busy || form.milestones.length >= MAX_MILESTONES}
        onClick={() => setForm({ ...form, milestones: [...form.milestones, emptyMilestone()] })}
      >
        Add milestone
      </button>

      <p className="mt-4 text-sm">
        Total to fund later: <strong>{formatEther(totalWei(form))} ETH</strong>
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Only hashes of the deliverable and criteria go on-chain. Keep the text and share it with the freelancer
        and arbiters. A hash proves what was agreed, not that the work is good.
      </p>

      {problems.length > 0 && (
        <ul className="mt-3 list-disc rounded border border-red-300 bg-red-50 p-3 pl-6 text-sm text-red-800">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}

      <button className="mt-4 rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        disabled={busy} onClick={submit}>
        {status ?? 'Create agreement'}
      </button>

      {created && (
        <div className="mt-5 rounded border border-green-300 bg-green-50 p-3 text-sm">
          <p className="font-semibold">Agreement #{created.id.toString()} created.</p>
          <p className="mt-1 break-all text-xs">Terms hash: {created.termsHash}</p>
          <a className="mt-1 block text-xs text-blue-700 underline" target="_blank" rel="noreferrer"
            href={`https://sepolia.etherscan.io/tx/${created.txHash}`}>
            View transaction on Etherscan
          </a>
          <p className="mt-3 text-xs">
            Send this terms document to the freelancer and both arbiters so they can verify what they accept.
          </p>
          <textarea readOnly className="mt-1 h-40 w-full rounded border bg-white p-2 font-mono text-xs"
            value={created.document} />
          <button className="mt-1 rounded bg-gray-200 px-3 py-1 text-xs"
            onClick={() => navigator.clipboard.writeText(created.document)}>
            Copy
          </button>
        </div>
      )}
    </section>
  )
}
