import { useState } from 'react'
import type { Hex } from 'viem'
import { useConfig, useWriteContract } from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { describeError } from './errors'

/**
 * Runs one write: simulate first (so reverts surface as readable errors and cost nothing),
 * then ask the wallet, then wait for the receipt, then call onDone.
 */
export function useTx(onDone: () => void) {
  const config = useConfig()
  const { writeContractAsync } = useWriteContract()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastHash, setLastHash] = useState<Hex | null>(null)

  async function run(label: string, simulate: () => Promise<{ request: unknown }>) {
    setError(null)
    try {
      setPending(`${label}: checking…`)
      const { request } = await simulate()
      setPending(`${label}: confirm in your wallet…`)
      const hash = await writeContractAsync(request as never)
      setLastHash(hash)
      setPending(`${label}: waiting for confirmation…`)
      const receipt = await waitForTransactionReceipt(config, { hash })
      if (receipt.status !== 'success') throw new Error('The transaction failed on-chain.')
      onDone()
    } catch (e) {
      setError(describeError(e))
    } finally {
      setPending(null)
    }
  }
  return { run, pending, error, lastHash }
}
