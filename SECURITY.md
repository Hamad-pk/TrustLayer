# Security

**Unaudited. For education and portfolio use only.**

## Scope and assumptions

See `docs/actors-and-trust.md` (trust assumptions, maximum loss per actor) and `docs/threat-test-matrix.md` (each threat, its mechanism, and its tests).

## Static analysis (Slither 0.11.6, solc 0.8.28)

Medium and above: no findings. Triage of the rest:

| Finding | Verdict |
|---|---|
| `uninitialized-state` on `_amounts` | False positive. The mapping of arrays is written with `push` inside `_storeMilestones`. Annotated in the source. |
| `uninitialized-local` on `reason` (in `resolve`) and `amount` (in `withdraw`) | False positive. Assigned in every branch that does not revert. Annotated. |
| `timestamp` | Intended. Deadlines are measured in days; validator drift of seconds is accepted (`docs/design-decisions.md`, D-25). |
| `low-level-calls` | Intended. Plain ETH send in `withdraw`, result checked, state updated first, `nonReentrant`. |

## Properties enforced in CI

- The contract never reads `address(this).balance` (ACC-9).
- No `Ownable`, `AccessControl`, `selfdestruct` or `delegatecall` in `src/` (AUTH-8).

## Known weaknesses

1. Arbiter honesty and availability are assumed; they have no incentive to respond. The default split is a fallback, not a guarantee of fairness.
2. A client can end an agreement after the current milestone with no compensation to the freelancer.
3. A freelancer silent for 14 days after a revision request forfeits that milestone.
4. If both parties stay silent on a `Submitted` milestone, funds remain locked.
5. ETH sent to the contract outside `fund` is lost forever.
6. A lost key means lost credit. There is no recovery.
7. No formal verification. No external audit.

## Reporting

This is a portfolio project. Please open a GitHub issue.
