import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useReadContract, useReadContracts } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { trustLayerAbi, trustLayerAddress } from '../generated'
import AgreementRow, { type Ag } from './AgreementRow'
import { Button, EmptyState, Input, Skeleton } from './ui'

const c = trustLayerAddress[sepolia.id]
const PAGE = 12

export default function Agreements() {
  const nav = useNavigate()
  const [page, setPage] = useState(0)
  const [jump, setJump] = useState('')
  const { data: cnt, isLoading: cl } = useReadContract({ address: c, abi: trustLayerAbi, functionName: 'agreementCount', chainId: sepolia.id })
  const n = cnt !== undefined ? Number(cnt) : 0
  const pages = Math.max(1, Math.ceil(n / PAGE))
  const p = Math.min(page, pages - 1)
  const ids = useMemo(() => {
    const out: number[] = []
    for (let i = n - p * PAGE; i > Math.max(0, n - (p + 1) * PAGE); i--) out.push(i)
    return out
  }, [n, p])
  const { data: rec, isLoading: rl } = useReadContracts({
    contracts: ids.map((id) => ({ address: c, abi: trustLayerAbi, functionName: 'getAgreement' as const, args: [BigInt(id)] as const, chainId: sepolia.id })),
    query: { enabled: ids.length > 0 },
  })

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold sm:text-5xl">Agreements</h1>
          <p className="mt-2 text-mute">{cl ? 'Reading the chain…' : `${n} on Sepolia, newest first.`}</p>
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (/^\d+$/.test(jump)) nav(`/agreement/${jump}`) }}>
          <Input inputMode="numeric" aria-label="Agreement number" placeholder="Go to #" value={jump} onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))} className="w-36" />
          <Button type="submit" variant="secondary" disabled={!jump}>Open</Button>
        </form>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-deep">
        {cl || rl ? (
          <div className="space-y-px p-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[76px]" />)}</div>
        ) : n === 0 ? (
          <div className="p-6"><EmptyState title="No agreements yet" description="Be the first to create one on Sepolia." action={<Link to="/create"><Button>Create an agreement</Button></Link>} /></div>
        ) : (
          <div className="divide-y divide-line-soft">
            {ids.map((id, idx) => {
              const row = rec?.[idx]
              return row?.status === 'success'
                ? <AgreementRow key={id} id={id} a={row.result as unknown as Ag} />
                : <div key={id} className="px-4 py-4 text-sm text-mute">#{id} could not be read.</div>
            })}
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm text-mute">
          <span>Page {p + 1} of {pages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={p === 0} onClick={() => setPage(p - 1)}><ChevronLeft className="h-4 w-4" />Newer</Button>
            <Button variant="secondary" size="sm" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>Older<ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  )
}
