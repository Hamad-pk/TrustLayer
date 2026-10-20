# Invariants

Kinds: **ACC** (accounting, tested with Foundry invariant handlers), **SAFE** (transition and structure rules, tested with state-machine and unit tests), **LIVE** (progress), and **AUTH** (access control, tested with unit and fuzz tests, not the invariant suite).

## Variables per agreement `g`

| Name | Meaning | Where it lives |
|---|---|---|
| `funded[g]` | Total ETH funded. Equals the sum of milestone amounts after `fund`, else 0 | storage (derivable) |
| `locked[g]` | ETH reserved for unsettled effective milestones | **storage** |
| `clientCredit[g]`, `freelancerCredit[g]` | Outstanding (unwithdrawn) credits | **storage** |
| `withdrawn[g]` | Cumulative ETH withdrawn by both parties | **ghost (test handler)** plus `Withdrawal` events |
| `allocated[g]` | Cumulative ETH credited, including withdrawn amounts: `outstanding + withdrawn` | **derived** |
| `forced` | ETH sent to the contract outside `fund` | **ghost** only (the contract cannot observe it) |

There is no stored `outstandingCredits` or `allocated`, so no second source of truth exists to drift.

## Accounting invariants

- **ACC-1 (universal conservation).** For every agreement in every state: `funded[g] = locked[g] + clientCredit[g] + freelancerCredit[g] + withdrawn[g]`.
  Cancellation and early ending move `locked` into credits, so this holds in terminal states too.
- **ACC-2 (locked identity, Active only).** `locked[g] = sum of amounts[i] for i in [currentIndex, endIndex]`. Therefore it is 0 when the range is empty.
- **ACC-3 (terminal).** `Completed` or `Cancelled` implies `locked[g] == 0`.
- **ACC-4 (exact balance identity, test-only).** `address(this).balance == sum over all g of (locked + clientCredit + freelancerCredit) + forced`.
  The handler tracks `forced` itself. This is an equality because the handler controls every inflow: `fund` is the only payable function and there is no `receive` or `fallback`.
- **ACC-5 (solvency, the on-chain meaning).** `address(this).balance >= sum over all g of (locked + clientCredit + freelancerCredit)`.
  It is an inequality because forced ETH can arrive. ACC-4 is stronger: it catches a leak of 1 wei that ACC-5 would hide.
- **ACC-6 (per settlement).** `clientAmount + freelancerAmount == amounts[index]` for every `MilestoneSettled`. Checked from events in the handler.
- **ACC-7 (withdrawals).** Per party, cumulative withdrawn is at most cumulative credited. A withdrawal zeroes that party's credit and changes nothing else.
- **ACC-8 (isolation).** Any function acting on agreement `g` changes storage only for `g`. A handler snapshots other agreements before and after each call and compares them.
- **ACC-9.** The contract never reads `address(this).balance` in logic (code review plus a grep check in CI).

## Safety rules

- **SAFE-1.** `status` only moves `Proposed` to `Active`, `Proposed` to `Cancelled`, `Active` to `Completed`, or `Active` to `Cancelled`.
- **SAFE-2.** `currentIndex` is non-decreasing. It never exceeds `endIndex + 1`.
- **SAFE-3.** A milestone is settled at most once (follows from SAFE-2 and ACC-6).
- **SAFE-4.** `Completed` implies every milestone in `[0, endIndex]` is settled, and `endIndex` never increases.
- **SAFE-5.** Terms never change after `create`: addresses, amounts, `count` and `termsHash` are never rewritten. (`endIndex` is an execution pointer, not a term.)
- **SAFE-6.** `Disputed` blocks `approve`, `requestRevision`, `submit` and `openDispute`.
- **SAFE-6b.** While a milestone is `Disputed`, its funds can leave only through `resolve()` or `defaultSplit()`. In every other call the milestone amount stays locked and the freelancer's credit does not increase. The client's `endAfterCurrent` may still refund *later* milestones, never the disputed one.
- **SAFE-7.** A dispute settles exactly once, with the full amount allocated.
- **SAFE-8.** In terminal states, every function except `withdraw` reverts.
- **SAFE-9.** The four participant addresses are nonzero and pairwise distinct, and no arbiter has a credit slot.
- **SAFE-10.** Funding happens at most once, and only after all three acceptances.

## Access control

- **AUTH-1.** `fund`, `approve`, `requestRevision`, `endAfterCurrent`: client only.
- **AUTH-2.** `submit`, `acceptAsFreelancer`: freelancer only.
- **AUTH-3.** `acceptAsArbiter`: the named primary or fallback only.
- **AUTH-4.** `resolve`: the primary only in `[opened, opened + 14d)`, the fallback only in `[opened + 14d, opened + 28d)`.
- **AUTH-5.** `openDispute`: client or freelancer only, under their phase and time conditions.
- **AUTH-6.** `defaultSplit`, `expireFreelancerWindow`: any caller, with no financial effect on the caller.
- **AUTH-7.** `withdraw` affects only the caller's own credit.
- **AUTH-8.** No function is restricted to an owner, and no owner exists.

## Liveness

- **LIVE-1 (withdrawal).** A party with credit, a valid transaction, and a `to` that accepts ETH can always withdraw, without anyone's cooperation.
- **LIVE-2 (dispute).** A `Disputed` milestone is allocated no later than 28 days after opening, by someone's transaction.
- **LIVE-3 (freelancer inactivity).** A `Working` or `RevisionRequested` phase past its deadline can be closed by any account.
- **LIVE-4 (unilateral progress).** In every non-terminal state holding locked funds, at least one stakeholder has a function that moves the state forward without the other's cooperation (see `silence-table.md`). The one exception is a `Submitted` milestone where both parties never act.
- **LIVE-5 (no deadlock on completion).** Completion is part of the settling transaction, so no finalizer is needed.

These assume transactions are included. They do not cover chain failure, censorship or implementation bugs.

## Foundry test mapping

| Test type | Targets |
|---|---|
| Invariant (handler + ghosts) | ACC-1 to ACC-8, SAFE-6b |
| Stateful fuzz | SAFE-1 to SAFE-4, SAFE-6 |
| Unit | AUTH-*, SAFE-5, SAFE-8 to SAFE-10, boundaries |
| Scenario tests | LIVE-1 to LIVE-4 |
