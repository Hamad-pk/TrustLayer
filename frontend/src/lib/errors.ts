import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem'

const messages: Record<string, string> = {
  AgreementNotFound: 'That agreement does not exist.',
  InvalidParticipants:
    'Participants must be nonzero and all different (client, freelancer, primary and fallback arbiter).',
  InvalidMilestoneCount: 'An agreement needs between 1 and 20 milestones.',
  InvalidAmount: 'Every milestone amount must be greater than zero.',
  InvalidHash: 'A required hash was empty.',
  TotalTooLarge: 'The total amount is too large.',
  WrongStatus: 'The agreement is not in the right status for this action.',
  WrongPhase: 'The current milestone is not in the right phase for this action.',
  NotClient: 'Only the client can do this.',
  NotFreelancer: 'Only the freelancer can do this.',
  NotArbiter: 'Only the arbiter whose time window is open can do this.',
  NotAuthorized: 'Your account is not allowed to do this right now.',
  NotParticipant: 'Only a participant in this agreement can do this.',
  AlreadyAccepted: 'You have already accepted this agreement.',
  TermsMismatch: 'The terms hash does not match the agreement. Do not accept; check the terms.',
  NotAllAccepted: 'The freelancer and both arbiters must accept before funding.',
  WrongFundingAmount: 'Funding must equal the exact total of all milestones.',
  DeadlinePassed: 'The deadline for this action has passed.',
  DeadlineNotReached: 'It is too early for this action. The deadline has not been reached.',
  WindowNotOpen: 'The time window for this action is not open.',
  InvalidAllocation: 'The allocation is larger than the milestone amount.',
  NothingToEnd: 'There are no future milestones left to end.',
  NoCredit: 'There is no credit to withdraw.',
  InvalidRecipient: 'Choose a valid recipient address.',
  TransferFailed: 'The transfer to the recipient failed. Try a different recipient address.',
}

/** Turns any wallet, RPC or contract error into one readable sentence. */
export function describeError(e: unknown): string {
  if (e instanceof BaseError) {
    if (e.walk((x) => x instanceof UserRejectedRequestError)) return 'You rejected the request in your wallet.'
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName
      if (name) return messages[name] ?? `The contract rejected the call (${name}).`
    }
    return e.shortMessage
  }
  return e instanceof Error ? e.message : 'Unknown error.'
}
