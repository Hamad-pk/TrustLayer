# User Stories and Acceptance Criteria

Every criterion has an ID. Test names should embed it (e.g. `test_AC_FUND_3_revertsOnWrongValue`).

## US-1 Create an agreement
As a client, I want to define the freelancer, arbiters and milestones so both sides know the rules before any ETH moves.
- **AC-CRE-1** Client, freelancer, primary and fallback arbiter are nonzero and pairwise distinct.
- **AC-CRE-2** Between 1 and 20 milestones.
- **AC-CRE-3** Every amount is greater than zero. The total is computed with checked arithmetic.
- **AC-CRE-4** Every deliverable hash and criteria hash is nonzero.
- **AC-CRE-5** `termsHash` is computed on-chain with `abi.encode` (including chainid, contract address, agreement id) and emitted with the full milestone data.
- **AC-CRE-6** No function can change terms after creation.

## US-2 Accept the terms
As the freelancer or an arbiter, I want to accept the exact terms.
- **AC-ACC-1** Only the named freelancer, primary or fallback can accept their own role.
- **AC-ACC-2** The caller passes a hash. A mismatch with `termsHash` reverts.
- **AC-ACC-3** A repeat acceptance reverts.
- **AC-ACC-4** Acceptance works only in `Proposed`.

## US-3 Cancel before funding
- **AC-CNL-1** The client, freelancer, or either arbiter may cancel.
- **AC-CNL-2** Only in `Proposed`.
- **AC-CNL-3** No ETH moves.

## US-4 Fund
- **AC-FUND-1** Only the client.
- **AC-FUND-2** All three acceptances are recorded.
- **AC-FUND-3** `msg.value` equals the total exactly.
- **AC-FUND-4** At most once.
- **AC-FUND-5** Milestone 0 becomes `Working` with a deadline of `now + 14d`.

## US-5 Submit work
- **AC-SUB-1** Only the freelancer.
- **AC-SUB-2** Phase is `Working` or `RevisionRequested`.
- **AC-SUB-3** Strictly before the phase deadline.
- **AC-SUB-4** Evidence hash is nonzero. An identical resubmission is allowed.
- **AC-SUB-5** Review deadline is `now + 7d`.

## US-5b Approve
- **AC-APP-1** Only the client.
- **AC-APP-2** Phase `Submitted`, including after the review deadline.
- **AC-APP-3** The freelancer is credited the full amount, once.
- **AC-APP-4** The next milestone activates, or the agreement completes.

## US-6 Request a revision
- **AC-REV-1** Only the client.
- **AC-REV-2** Phase `Submitted` and `now < review deadline`.
- **AC-REV-3** Reason hash is nonzero.
- **AC-REV-4** Response deadline is `now + 14d`.
- **AC-REV-5** There is no request-count limit (D-12).

## US-7 Open a dispute
- **AC-DIS-1** The client may open when `Submitted`, at any time.
- **AC-DIS-2** The freelancer may open when `Submitted` and `now >= review deadline`, or when `RevisionRequested`.
- **AC-DIS-3** No other account may open.
- **AC-DIS-4** Opening disables `approve`, `requestRevision`, `submit` and `openDispute`.
- **AC-DIS-5** `disputeOpenedAt` is recorded. Windows are `[opened, +14d)` and `[+14d, +28d)`.

## US-8 Resolve a dispute
- **AC-RES-1** The primary arbiter only in the primary window.
- **AC-RES-2** The fallback arbiter only in the fallback window.
- **AC-RES-3** `freelancerAmount <= amount`. The client receives the remainder.
- **AC-RES-4** Arbiters are never credited.
- **AC-RES-5** At or after `+28d`, any account may call the default split: client `amount / 2` (floor), freelancer the remainder.
- **AC-RES-6** A milestone settles exactly once.

## US-9 Freelancer inactivity
- **AC-TMO-1** Any account may trigger it.
- **AC-TMO-2** Phase is `Working` or `RevisionRequested` and `now >= deadline`.
- **AC-TMO-3** The client is credited the current amount and every future amount. `locked` becomes 0. The status becomes `Cancelled`.
- **AC-TMO-4** Earlier settlements and existing credits are untouched.
- **AC-TMO-5** The caller receives nothing.
- **AC-TMO-6** No loop over milestones (tested with 20 milestones).

## US-10 End after the current milestone
- **AC-END-1** Only the client.
- **AC-END-2** Status `Active` and `endIndex > currentIndex`.
- **AC-END-3** The client is credited `locked - currentAmount` immediately.
- **AC-END-4** The current milestone is unaffected, including a dispute in progress.
- **AC-END-5** The agreement becomes `Completed` when the milestone at the new `endIndex` settles.
- **AC-END-6** No loop over milestones.

## US-11 Withdraw
- **AC-WD-1** Only the client or freelancer of that agreement, and only their own credit.
- **AC-WD-2** Credit must be greater than zero.
- **AC-WD-3** Credit is zeroed before the transfer, and the function is guarded against reentrancy.
- **AC-WD-4** A failed transfer reverts the whole transaction and preserves the credit.
- **AC-WD-5** `to` is nonzero and is not the contract.
- **AC-WD-6** One party's failed withdrawal never affects the other's.
- **AC-WD-7** Works in terminal states.

## US-12 Verify independently of the frontend
- **AC-VER-1** View functions return participants, status, phase, deadlines, indices, `locked`, credits and `termsHash`. Milestone hashes are in `AgreementCreated`.
- **AC-VER-2** An event exists for every state change.
- **AC-VER-3** The UI distinguishes "settled" from "withdrawn" and "hash" from "proof of quality".
- **AC-VER-4** The UI shows the contract address, `termsHash`, and a way to check it.

## Terminal state
- **AC-TERM-1** Every function except `withdraw` reverts on `Completed` and `Cancelled`.

## Deferred
ERC-20, appeals, mutual cancellation with a negotiated split, partial approval, kill fees, on-chain evidence storage, signature-authorized recipients, reputation, parallel milestones.
