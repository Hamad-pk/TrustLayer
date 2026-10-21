import { ArrowUpRight } from 'lucide-react'
import { sepolia } from 'wagmi/chains'
import { trustLayerAddress } from '../generated'
import { PROOF, REPO_URL } from '../lib/site'

const etherscan = `https://sepolia.etherscan.io/address/${trustLayerAddress[sepolia.id]}#code`
const ITEMS = [
  { value: String(PROOF.tests), label: 'unit, fuzz and adversarial tests', href: `${REPO_URL}/blob/main/TESTING.md` },
  { value: String(PROOF.invariants), label: 'invariants checked over random action sequences', href: `${REPO_URL}/blob/main/docs/invariants.md` },
  { value: '0', label: 'admin keys, pause switches or upgrade paths', href: etherscan },
  { value: 'Verified', label: 'source code on Etherscan', href: etherscan },
]

export default function ProofStrip() {
  return (
    <section aria-label="Evidence">
      <ul className="grid grid-cols-2 border-y border-line-soft lg:grid-cols-4">
        {ITEMS.map((it, i) => (
          <li key={it.label} className={`${i % 2 === 1 ? 'border-l border-line-soft' : ''} ${i > 0 ? 'lg:border-l lg:border-line-soft' : ''} ${i > 1 ? 'border-t border-line-soft lg:border-t-0' : ''}`}>
            <a href={it.href} target="_blank" rel="noreferrer" className="group block h-full px-5 py-6 transition hover:bg-raise/50 sm:px-7">
              <div className="flex items-start justify-between gap-2">
                <span className="font-display text-3xl font-semibold tabular sm:text-4xl">{it.value}</span>
                <ArrowUpRight className="h-4 w-4 text-faint transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
              </div>
              <p className="mt-2 text-[14px] leading-snug text-mute">{it.label}</p>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-faint">Unaudited portfolio project. Each figure links to the evidence.</p>
    </section>
  )
}
