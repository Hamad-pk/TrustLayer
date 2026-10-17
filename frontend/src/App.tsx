import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { trustLayerAbi, trustLayerAddress } from './generated'
import CreateAgreement from './components/CreateAgreement'

export default function App() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

  const { data: count, isLoading, error } = useReadContract({
    address: trustLayerAddress[sepolia.id],
    abi: trustLayerAbi,
    functionName: 'agreementCount',
    chainId: sepolia.id,
  })

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">TrustLayer</h1>
      <p className="mt-1 text-sm text-gray-500">Milestone escrow on Sepolia</p>

      <section className="mt-6 rounded-lg border p-4">
        {isConnected ? (
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-sm break-all">{address}</span>
            <button className="rounded bg-gray-200 px-3 py-1 text-sm" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {connectors.map((c) => (
              <button
                key={c.uid}
                className="rounded bg-black px-3 py-1 text-sm text-white"
                onClick={() => connect({ connector: c })}
              >
                Connect {c.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-lg border p-4 text-sm">
        <div className="text-gray-500">Agreements created on-chain</div>
        <div className="mt-1 text-xl">
          {isLoading ? 'Loading…' : error ? 'Could not read the contract' : String(count)}
        </div>
      </section>
      {isConnected && <CreateAgreement />}
    </main>
  )
}
