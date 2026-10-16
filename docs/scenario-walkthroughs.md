# Scenario Walkthroughs

Amounts are in ETH for readability. Contract logic uses wei.

## S1 Normal agreement (2 milestones of 1 ETH)
Client creates. Freelancer and both arbiters accept with the matching hash. Client funds 2 ETH. Freelancer submits M0, client approves, `freelancerCredit = 1`, `locked = 1`, M1 activates. Same for M1: `Completed`, `locked = 0`. Freelancer withdraws 2 ETH. ACC-1 holds at each step.

## S2 Client silent, arbiters silent
M2 is submitted. After 7d the client has not acted. The freelancer opens a dispute. Both arbiters stay silent for 28d. Anyone calls `defaultSplit`: client gets half (floor), freelancer gets the rest. M2 settles once. Earlier milestones are untouched. The outcome is deterministic but not guaranteed fair. Both sides saw both arbiters accept before funding.

## S3 Freelancer never submits (1 ETH single milestone)
The deadline passes at day 14. Anyone calls `expireFreelancerWindow`. The client is credited 1 ETH, the freelancer 0. Status is `Cancelled`. The freelancer's payout for doing nothing is zero (this fixes the earlier 50% flaw).

## S4 Freelancer finishes M0, then abandons M1
M0 is settled and credited. M1 expires after 14d: the client is credited M1 and all later milestones. M0 credit is intact and withdrawable.

## S5 Freelancer and arbiter collude
The freelancer submits junk for M3. The client sees it and calls `openDispute` right away. The arbiter awards the freelancer 100%. Loss: one milestone. Had the client suspected collusion earlier, they could have called `endAfterCurrent` before submission to refund M4 onward. That call also works mid-dispute. Then the agreement completes after M3 settles.

## S6 Client and arbiter collude
The freelancer submits M2. The client disputes. The arbiter awards the client 100%. M3 activates. The freelancer, seeing the pattern, simply never submits. M3 refunds to the client at day 14. Loss: one milestone plus the time.

## S7 Submit-and-dispute immediately
The freelancer submits and calls `openDispute` in the next block. It reverts: the review deadline has not passed and the phase is not `RevisionRequested`. The client may dispute at any time.

## S8 Third party front-runs a late approval
The review deadline passes and the client is a day late. A third party tries `openDispute`. It reverts: only parties may open (D-11). The freelancer could open it, but that is their own choice. The client's `approve` succeeds.

## S9 Freelancer address is a contract that rejects ETH
Settlement credits the freelancer's slot with no transfer. `withdraw(id, to = freelancer)` reverts and the credit is preserved. The freelancer calls `withdraw(id, to = another address they control)`. The client's own withdrawal is unaffected (AC-WD-6). If the freelancer's key is lost, the credit is lost too.

## S10 Boundary at exactly the deadline
At `block.timestamp == deadline`, `submit` reverts and `expireFreelancerWindow` succeeds. At `deadline - 1`, the reverse. The same is true at `+14d` for the primary arbiter (`resolve` reverts) and the fallback arbiter (succeeds), and at `+28d` for the fallback arbiter and `defaultSplit`.

## S11 Approve vs dispute race
The review deadline has passed. The client's `approve` and the freelancer's `openDispute` are both pending. If `approve` is mined first, the milestone settles and the dispute reverts. If the dispute is mined first, `approve` reverts. Never both.

## S12 Arbiter declines before funding
The primary arbiter calls `cancelBeforeFunding`. The agreement is `Cancelled`. No ETH was ever held. The client creates a new agreement with another arbiter, and the freelancer re-accepts the new hash.

## S13 Terms mismatch at acceptance
The freelancer passes a hash they computed from a document that differs from the client's. `acceptAsFreelancer` reverts with a hash mismatch. Nobody is bound to unseen terms.

## S14 Forced ETH
Someone sends 1 ETH by `selfdestruct`. `address(this).balance` rises. No credit or locked amount changes. ACC-5 still holds. ACC-4 holds only if the handler's `forced` ghost includes it. The 1 ETH is permanently stranded.

## S15 Revision loop
The client requests three revisions. The freelancer resubmits each time (identical evidence is allowed). At any point the freelancer can open a dispute from `RevisionRequested`. If the freelancer stops responding, the 14d timeout refunds the client.