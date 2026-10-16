# Transition Table (normative)

Tests must match this table row for row. `settle(client, freelancer, reason)` is the shared internal routine:
`locked -= amount`; credit the client and freelancer; emit `MilestoneSettled`; then either mark `Completed` (if `currentIndex == endIndex`) or increment `currentIndex`, set phase `Working` and a new submission deadline.

| ID | Function | Caller | Preconditions | Accounting effect | Result | Events |
|---|---|---|---|---|---|---|
| T-01 | `create` | Client | 4 distinct nonzero addresses; 1 to 20 milestones; amounts > 0; hashes nonzero; checked total | Terms hash stored. `funded = 0` | `Proposed` | `AgreementCreated` (full milestone data) |
| T-02 | `acceptAsFreelancer(id, hash)` | Freelancer | `Proposed`; hash equals `termsHash`; not already accepted | None | Flag set | `AgreementAccepted` |
| T-03 | `acceptAsArbiter(id, hash)` | Primary or fallback arbiter | Same as T-02 | None | Flag set | `AgreementAccepted` |
| T-04 | `cancelBeforeFunding` | Client, freelancer, either arbiter | `Proposed` | None | `Cancelled` | `AgreementCancelled` |
| T-05 | `fund` | Client | `Proposed`; all three accepted; `msg.value == total` | `funded = locked = total` | `Active`, `Working`, deadline = now + 14d | `AgreementFunded` |
| T-06 | `submit(id, evidenceHash)` | Freelancer | `Working` and `now < deadline`; hash nonzero | None | `Submitted`, review deadline = now + 7d | `MilestoneSubmitted` |
| T-07 | `submit(id, evidenceHash)` | Freelancer | `RevisionRequested` and `now < deadline`; hash nonzero. An identical hash is allowed | None | `Submitted`, review deadline = now + 7d | `MilestoneSubmitted` |
| T-08 | `approve` | Client | `Submitted` (no deadline check) | `settle(0, amount, Approved)` | next milestone or `Completed` | `MilestoneSettled` (+ `AgreementCompleted`) |
| T-09 | `requestRevision(id, reasonHash)` | Client | `Submitted` and `now < review deadline`; hash nonzero | None | `RevisionRequested`, deadline = now + 14d | `RevisionRequested` |
| T-10 | `openDispute` | Client | `Submitted` | None | `Disputed`, `disputeOpenedAt = now` | `DisputeOpened` |
| T-11 | `openDispute` | Freelancer | (`Submitted` and `now >= review deadline`) or `RevisionRequested` | None | `Disputed` | `DisputeOpened` |
| T-12 | `resolve(id, freelancerAmount)` | Primary arbiter | `Disputed`; `now < opened + 14d`; `freelancerAmount <= amount` | `settle(amount - f, f, PrimaryRuling)` | next or `Completed` | `MilestoneSettled` |
| T-13 | `resolve(id, freelancerAmount)` | Fallback arbiter | `Disputed`; `opened + 14d <= now < opened + 28d`; same bound | `settle(amount - f, f, FallbackRuling)` | next or `Completed` | `MilestoneSettled` |
| T-14 | `defaultSplit` | Any account | `Disputed`; `now >= opened + 28d` | `settle(amount/2, amount - amount/2, DefaultSplit)` | next or `Completed` | `MilestoneSettled` |
| T-15 | `expireFreelancerWindow` | Any account | (`Working` or `RevisionRequested`) and `now >= deadline` | Client credited the current amount plus `locked - currentAmount`. `locked = 0`. `currentIndex++` | `Cancelled` | `MilestoneSettled` (FreelancerTimeout), `AgreementCancelled` |
| T-16 | `endAfterCurrent` | Client | `Active`; `endIndex > currentIndex` | Client credited `locked - currentAmount`. `locked = currentAmount`. `endIndex = currentIndex`. Phase unchanged | `Active` | `EndedAfterCurrent` |
| T-17 | `withdraw(id, to)` | Client or freelancer of that agreement | Credit > 0; `to` not zero and not this contract | Credit zeroed **before** the transfer. Exact amount sent via `call`. Failure reverts the whole transaction | any status | `Withdrawal` |

## Rules

1. Any state-changing function other than `withdraw` reverts on `Completed` and `Cancelled` (AC-TERM-1).
2. `currentAmount` means `amounts[currentIndex]`.
3. No transition reads `address(this).balance`.
4. No timeout or exit iterates over milestones.
5. When two valid transactions race, the first mined wins and the second reverts on its re-checked preconditions.
6. Every listed function is `nonReentrant` where it moves ETH (only T-17 does), and follows checks-effects-interactions everywhere.
