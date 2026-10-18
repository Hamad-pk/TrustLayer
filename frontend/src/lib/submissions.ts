import type { Address, Hex, PublicClient } from 'viem'
import { trustLayerAbi } from '../generated'

export type Submission = { index: number; evidenceHash: Hex; reviewDeadline: bigint; txHash: Hex; blockNumber: bigint }

/**
 * Reads MilestoneSubmitted events for one agreement. The contract stores only the hash, so the event log is the
 * on-chain record of what was submitted. Queries are chunked because many RPC providers cap the block range.
 */
export async function fetchSubmissions(
  client: PublicClient,
  contract: Address,
  id: bigint,
  fromBlock: bigint,
  chunk = 9_000n,
): Promise<Submission[]> {
  const latest = await client.getBlockNumber({ cacheTime: 0 }) // no cache: a stale head would miss a just-mined submission
  const out: Submission[] = []
  for (let start = fromBlock; start <= latest; start += chunk) {
    const end = start + chunk - 1n < latest ? start + chunk - 1n : latest
    const logs = await client.getContractEvents({
      abi: trustLayerAbi,
      address: contract,
      eventName: 'MilestoneSubmitted',
      args: { id },
      fromBlock: start,
      toBlock: end,
    })
    for (const l of logs) {
      out.push({
        index: Number(l.args.index),
        evidenceHash: l.args.evidenceHash as Hex,
        reviewDeadline: l.args.reviewDeadline as bigint,
        txHash: l.transactionHash as Hex,
        blockNumber: l.blockNumber as bigint,
      })
    }
  }
  return out
}

/** The most recent submission for a given milestone index (resubmissions replace earlier ones). */
export function latestFor(subs: Submission[], index: number): Submission | undefined {
  return subs.filter((s) => s.index === index).sort((a, b) => Number(b.blockNumber - a.blockNumber))[0]
}

const key = (hash: string) => `trustlayer:evidence:${hash}`
export function saveEvidence(hash: string, text: string) {
  try { localStorage.setItem(key(hash), text) } catch { /* storage unavailable */ }
}
export function loadEvidence(hash: string): string {
  try { return localStorage.getItem(key(hash)) ?? '' } catch { return '' }
}
