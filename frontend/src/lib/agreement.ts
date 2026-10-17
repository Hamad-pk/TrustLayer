import {
  encodeAbiParameters,
  isAddress,
  keccak256,
  parseEther,
  toBytes,
  zeroAddress,
  type Address,
  type Hex,
} from 'viem'

export const MAX_MILESTONES = 20
export const POLICY_VERSION = 1n
const UINT128_MAX = (1n << 128n) - 1n

export type MilestoneForm = { description: string; criteria: string; amountEth: string }
export type CreateForm = {
  freelancer: string
  primary: string
  fallback: string
  milestones: MilestoneForm[]
}
export type MilestoneArg = { amount: bigint; deliverableHash: Hex; criteriaHash: Hex }

export const emptyMilestone = (): MilestoneForm => ({ description: '', criteria: '', amountEth: '' })

/** Convention shared by every party: keccak256 of the UTF-8 bytes of the text after trimming outer whitespace. */
export const hashText = (text: string): Hex => keccak256(toBytes(text.trim()))

function parseAmount(s: string): bigint | null {
  try {
    const v = parseEther(s.trim())
    return v
  } catch {
    return null
  }
}

/** Mirrors the contract's creation rules so users see problems before paying gas. The contract still enforces them. */
export function validate(form: CreateForm, client?: Address): string[] {
  const errors: string[] = []
  const roles: [string, string][] = [
    ['Freelancer', form.freelancer],
    ['Primary arbiter', form.primary],
    ['Fallback arbiter', form.fallback],
  ]
  for (const [label, value] of roles) {
    if (!isAddress(value)) errors.push(`${label} must be a valid address.`)
    else if (value.toLowerCase() === zeroAddress) errors.push(`${label} cannot be the zero address.`)
  }
  const valid = roles.map(([, v]) => v.toLowerCase()).filter((v) => isAddress(v as Address))
  if (client) valid.push(client.toLowerCase())
  if (new Set(valid).size !== valid.length) {
    errors.push('Client, freelancer and both arbiters must all be different addresses.')
  }

  if (form.milestones.length < 1) errors.push('Add at least one milestone.')
  if (form.milestones.length > MAX_MILESTONES) errors.push(`At most ${MAX_MILESTONES} milestones.`)

  let total = 0n
  form.milestones.forEach((m, i) => {
    const n = i + 1
    if (!m.description.trim()) errors.push(`Milestone ${n}: describe the deliverable.`)
    if (!m.criteria.trim()) errors.push(`Milestone ${n}: state the acceptance criteria.`)
    const amt = parseAmount(m.amountEth)
    if (amt === null || amt <= 0n) errors.push(`Milestone ${n}: enter an amount greater than 0.`)
    else if (amt > UINT128_MAX) errors.push(`Milestone ${n}: amount is too large.`)
    else total += amt
  })
  if (total > UINT128_MAX) errors.push('Total amount is too large.')
  return errors
}

export function totalWei(form: CreateForm): bigint {
  return form.milestones.reduce((sum, m) => sum + (parseAmount(m.amountEth) ?? 0n), 0n)
}

/** Only call after validate() returns no errors. */
export function toContractArgs(form: CreateForm): {
  freelancer: Address
  primary: Address
  fallback: Address
  milestones: MilestoneArg[]
} {
  return {
    freelancer: form.freelancer as Address,
    primary: form.primary as Address,
    fallback: form.fallback as Address,
    milestones: form.milestones.map((m) => ({
      amount: parseAmount(m.amountEth)!,
      deliverableHash: hashText(m.description),
      criteriaHash: hashText(m.criteria),
    })),
  }
}

/** Independent browser-side computation of TrustLayer.computeTermsHash. Used to verify terms before accepting. */
export function computeTermsHash(p: {
  chainId: bigint
  contract: Address
  id: bigint
  client: Address
  freelancer: Address
  primary: Address
  fallback: Address
  milestones: MilestoneArg[]
}): Hex {
  const encoded = encodeAbiParameters(
    [
      { type: 'uint256' },
      { type: 'address' },
      { type: 'uint256' },
      { type: 'address' },
      { type: 'address' },
      { type: 'address' },
      { type: 'address' },
      { type: 'uint256' },
      {
        type: 'tuple[]',
        components: [
          { name: 'amount', type: 'uint128' },
          { name: 'deliverableHash', type: 'bytes32' },
          { name: 'criteriaHash', type: 'bytes32' },
        ],
      },
    ],
    [p.chainId, p.contract, p.id, p.client, p.freelancer, p.primary, p.fallback, POLICY_VERSION, p.milestones],
  )
  return keccak256(encoded)
}
