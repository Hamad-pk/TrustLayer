# Threat -> Mechanism -> Criteria -> Test

"Non-mitigation" rows are accepted risks, documented honestly.

| # | Threat | Mechanism | Criteria / invariants | Required tests |
|---|---|---|---|---|
| 1 | Funding before acceptances | Fund requires all three flags | AC-FUND-2, SAFE-10 | Unit: each missing flag. Fuzz acceptance order |
| 2 | Accepting terms the acceptor never saw, or terms edited | Hash argument must match. Terms immutable | AC-ACC-2, AC-CRE-6, SAFE-5 | Wrong-hash revert. No setter exists (ABI check) |
| 3 | Hash collision from packed encoding | `abi.encode` | AC-CRE-5 | Unit: arrays of differing shape produce differing hashes |
| 4 | Wrong or short funding | Exact `msg.value` | AC-FUND-3 | Fuzz value around the total |
| 5 | Late submission | Strict `<` boundary | AC-SUB-3 | Boundary: deadline-1, deadline, deadline+1 |
| 6 | Freelancer never submits | Permissionless timeout, full refund | AC-TMO-*, LIVE-3, ACC-1 | Timeout unit. Zero freelancer credit asserted |
| 7 | Freelancer walks away mid-agreement | Same timeout. Earlier credits kept | AC-TMO-4 | Scenario: M0 settled, M1 timeout |
| 8 | Freelancer ignores a revision request | Timeout after 14d, or the freelancer disputes | AC-TMO-2, AC-DIS-2 | Boundary on revision deadline. Freelancer dispute from `RevisionRequested` |
| 9 | Client approves after dispute opens | Phase guard | SAFE-6, AC-DIS-4 | Revert test |
| 10 | Approve vs dispute race | State re-checked at execution | AC-APP-2, SAFE-3 | Both orderings. One wins, no double allocation |
| 11 | Third party forces arbitration | Only the parties may open | AC-DIS-3 | Revert for an arbitrary caller |
| 12 | Premature freelancer dispute | Needs deadline or `RevisionRequested` | AC-DIS-2 | Revert before the review deadline |
| 13 | Endless revision loop used to stall | No count limit, but either party can escalate or end | AC-REV-5, LIVE-4 | Scenario: 5 revision cycles, then freelancer dispute |
| 14 | Arbiter allocates beyond amount | Single parameter bounded by amount | AC-RES-3, ACC-6 | Fuzz `freelancerAmount` including `amount + 1` |
| 15 | Arbiter pays itself | No arbiter credit slot | AC-RES-4, SAFE-9 | Assert arbiter ETH and credits unchanged |
| 16 | Wrong arbiter or wrong window | Role + time check | AUTH-4, AC-RES-1, AC-RES-2 | Boundary at +14d and +28d for both |
| 17 | Both arbiters silent | Default split at +28d | AC-RES-5, LIVE-2 | Boundary. Odd-wei case. Fuzz amounts |
| 18 | Arbiter collusion | **Non-mitigation.** Bounded to one milestone per ruling, exits exist | Actors doc | Test only the bounds |
| 19 | Freelancer + arbiter drain the full escrow | `endAfterCurrent` | AC-END-* | Scenario: client ends mid-dispute, then loses only the current milestone |
| 20 | `endAfterCurrent` or timeout runs out of gas | Aggregate `locked`, no loop | AC-END-6, AC-TMO-6 | 20-milestone gas test |
| 21 | Double allocation | Single settle path, `currentIndex` monotonic | SAFE-2, SAFE-3, ACC-1, ACC-6 | Invariant suite |
| 22 | Reentrant withdrawal | CEI + guard | AC-WD-3 | Malicious receiver test |
| 23 | Reverting or gas-hungry receiver | Pull payment, revert preserves credit, `to` redirect | AC-WD-4, AC-WD-5, AC-WD-6 | Reverting receiver. Redirect to a good address. Other party still withdraws |
| 24 | Withdrawing someone else's credit | Caller checked against stored party | AUTH-7, AC-WD-1 | Fuzz callers |
| 25 | Forced ETH | Logic never reads the balance. Stranded | ACC-4, ACC-5, ACC-9 | `vm.deal` and a selfdestruct helper in the handler |
| 26 | One agreement affects another | Per-agreement storage | ACC-8, D-02 | Snapshot comparison in the handler |
| 27 | Invalid creation inputs | Validation | AC-CRE-1 to AC-CRE-4 | Fuzz addresses and amounts, 0 and 21 milestones, overflow |
| 28 | Any action after a terminal state | Terminal guard | AC-TERM-1, SAFE-8 | Call every function after `Completed` and `Cancelled` |
| 29 | Frontend lies about terms | Hash and events | AC-VER-* | Manual verification doc and a UI check |
| 30 | Missing criteria document | **Non-mitigation.** Trust assumption 5 | AC-VER-4 | UI requirement |
| 31 | Dead arbiters chosen by the client | Opt-in. Visible before acceptance. Default split | AC-ACC-*, AC-RES-5 | Documented residual risk |
| 32 | Timeout caller seeks a reward | No reward exists | AC-TMO-5 | Caller credit and balance unchanged |

## Test levels

- **Unit:** every transition, authorization, boundary and revert.
- **Fuzz:** amounts, splits, timestamps, callers, action order.
- **Invariant:** ACC-1 to ACC-8 across random sequences, with ghost variables for withdrawals and forced ETH.
- **Adversarial:** reentrant and reverting receivers, forced ETH, colluding-arbiter scenarios.
- **Static analysis:** Slither in CI, findings triaged in `SECURITY.md`.