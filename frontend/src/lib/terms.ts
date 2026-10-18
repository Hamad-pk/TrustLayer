import { isAddress, parseEther, type Address, type Hex } from 'viem'
import { computeTermsHash, hashText, type MilestoneArg } from './agreement'

export type TermsMilestone = {
  description: string
  acceptanceCriteria: string
  amountEth: string
  deliverableHash: Hex
  criteriaHash: Hex
}

export type TermsDocument = {
  note: string
  chainId: number
  contract: Address
  agreementId: string
  termsHash: Hex
  client: Address
  freelancer: Address
  primaryArbiter: Address
  fallbackArbiter: Address
  milestones: TermsMilestone[]
}

export function buildTermsDocument(p: {
  chainId: number
  contract: Address
  id: bigint
  termsHash: Hex
  client: Address
  freelancer: Address
  primary: Address
  fallback: Address
  texts: { description: string; criteria: string; amountEth: string }[]
  hashes: MilestoneArg[]
}): string {
  const doc: TermsDocument = {
    note: 'Share this with the freelancer and arbiters. Each hash is keccak256 of the UTF-8 text after trimming whitespace.',
    chainId: p.chainId,
    contract: p.contract,
    agreementId: p.id.toString(),
    termsHash: p.termsHash,
    client: p.client,
    freelancer: p.freelancer,
    primaryArbiter: p.primary,
    fallbackArbiter: p.fallback,
    milestones: p.texts.map((t, i) => ({
      description: t.description.trim(),
      acceptanceCriteria: t.criteria.trim(),
      amountEth: t.amountEth.trim(),
      deliverableHash: p.hashes[i].deliverableHash,
      criteriaHash: p.hashes[i].criteriaHash,
    })),
  }
  return JSON.stringify(doc, null, 2)
}

export type Verification =
  | { ok: true; doc: TermsDocument; computedHash: Hex }
  | { ok: false; problems: string[] }

/**
 * Recomputes the terms hash from the TEXT in the document (never trusting the hashes written in it)
 * and compares it with the hash committed on-chain. ok === true means the document is exactly what was committed.
 */
export function verifyTermsDocument(
  text: string,
  expected: { chainId: number; contract: Address; id: bigint; termsHash: Hex },
): Verification {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let doc: any
  try {
    doc = JSON.parse(text)
  } catch {
    return { ok: false, problems: ['That is not valid JSON. Paste the full terms document.'] }
  }
  const problems: string[] = []
  if (doc?.chainId !== expected.chainId) problems.push('The document is for a different network.')
  if (String(doc?.contract).toLowerCase() !== expected.contract.toLowerCase())
    problems.push('The document is for a different contract.')
  if (String(doc?.agreementId) !== expected.id.toString())
    problems.push(`The document is for agreement #${String(doc?.agreementId)}, not #${expected.id}.`)
  for (const k of ['client', 'freelancer', 'primaryArbiter', 'fallbackArbiter'] as const) {
    if (!isAddress(String(doc?.[k]))) problems.push(`The document has an invalid ${k} address.`)
  }
  if (!Array.isArray(doc?.milestones) || doc.milestones.length === 0) problems.push('The document has no milestones.')
  if (problems.length > 0) return { ok: false, problems }

  try {
    const milestones: MilestoneArg[] = doc.milestones.map((m: TermsMilestone) => ({
      amount: parseEther(String(m.amountEth).trim()),
      deliverableHash: hashText(String(m.description)),
      criteriaHash: hashText(String(m.acceptanceCriteria)),
    }))
    const computedHash = computeTermsHash({
      chainId: BigInt(expected.chainId),
      contract: expected.contract,
      id: expected.id,
      client: doc.client,
      freelancer: doc.freelancer,
      primary: doc.primaryArbiter,
      fallback: doc.fallbackArbiter,
      milestones,
    })
    if (computedHash !== expected.termsHash) {
      return {
        ok: false,
        problems: [
          'These terms do NOT match what is committed on-chain (a name, amount, deliverable or criterion differs). Do not accept.',
        ],
      }
    }
    return { ok: true, doc: doc as TermsDocument, computedHash }
  } catch {
    return { ok: false, problems: ['The document could not be read. Check that it was copied completely.'] }
  }
}

const key = (chainId: number, id: bigint) => `trustlayer:terms:${chainId}:${id}`
export function loadSavedTerms(chainId: number, id: bigint): string {
  try {
    return localStorage.getItem(key(chainId, id)) ?? ''
  } catch {
    return ''
  }
}
export function saveTerms(chainId: number, id: bigint, text: string) {
  try {
    localStorage.setItem(key(chainId, id), text)
  } catch {
    /* storage unavailable: the user still has the document on screen */
  }
}
