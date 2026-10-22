# Silence Table

Question for each state: if nobody ever acts again, what happens to the locked ETH, and who can move it?

| State | Who can force progress | Mechanism | After how long | If nobody with a stake acts |
|---|---|---|---|---|
| `Proposed` | No funds exist | Anyone named can cancel | any time | Nothing is at stake |
| `Working` | Any account | `expireFreelancerWindow`: full refund to client, agreement cancelled | 14d after activation | Freelancer silence loses the milestone |
| `Submitted` | Client: any time (`approve` or `openDispute`). Freelancer: `openDispute` | Deadline is 7d after submission | 0 / 7d | **Funds stay locked.** Both parties chose not to act. Documented limitation |
| `RevisionRequested` | Freelancer: any time (`submit` or `openDispute`). Any account: `expireFreelancerWindow` at/after deadline | Refund to client | 14d after request | At/after the deadline, dispute and timeout are both eligible; the first mined transaction wins. A dispute starts arbitration; a timeout cancels the agreement and refunds the current and future milestones. |
| `Disputed` | Primary arbiter, then fallback, then any account (`defaultSplit`) | 14d, 14d, then split | 28d after opening | Split is deterministic, so no stuck state |
| `Completed` or `Cancelled` | Each credited party | `withdraw` | any time | An owner's credit waits forever. No sweep exists |

## Is silence ever a best strategy?

| Party | Does silence pay? |
|---|---|
| Freelancer, `Working` | No. They get nothing. |
| Freelancer, `RevisionRequested` | No. They lose the milestone. They can escalate immediately instead. |
| Client, `Submitted` | Only through arbitration. A silent client lets the freelancer open a dispute after 7d. With two failed arbiters the client keeps half. That outcome needs both opted-in arbiters to fail, and the client has no way to cause it alone. |
| Arbiters | No incentive to respond exists, because there are no fees. Documented limitation. Mitigation: opt-in, a fallback, and the default split. |

## Residual unfairness

- A genuinely unreachable freelancer loses a milestone after 14 days (D-13).
- A client who is silent and has nominated two failing arbiters could get 50% of delivered work. The freelancer can see and verify both arbiters' acceptance before accepting.
