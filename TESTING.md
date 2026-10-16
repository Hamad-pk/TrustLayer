# Testing

Run `forge test`. Names embed the acceptance-criteria IDs from `docs/user-stories.md`.

## Levels

| Level | File | What it establishes |
|---|---|---|
| Unit (65 tests) | `test/TrustLayer.t.sol` | Every transition, authorization, revert and exact deadline boundary |
| Fuzz (9 properties, 512 runs each) | `test/Fuzz.t.sol` | Ruling and default-split exactness, boundary exclusivity (`submit` vs `expire`), authorization over arbitrary callers and times |
| Adversarial (8 tests) | `test/Adversarial.t.sol` | Reentrant receiver paid once, reverting receiver preserves credit, gas-burning receiver, forced ETH, collusion bounded by `endAfterCurrent`, gas with 20 milestones |
| Invariant (8 invariants, 256 runs x 100 calls) | `test/invariant/` | ACC-1 to ACC-8, SAFE-1 to SAFE-4 across random multi-agreement action sequences |

Total at the time of writing: 82 unit/fuzz/adversarial tests plus 8 invariants, all passing.

## Invariant suite details

- `Handler.advance` is state-aware (it picks a plausible next action for a live agreement's phase) and mixes in invalid calls, boundary-exact time jumps, forced ETH, and withdrawals to arbitrary recipients. Without it, uniformly random calls almost never reached disputes or defaults, and the suite would have passed vacuously. Run `forge test --match-path "test/invariant/*" -vv` to see per-action hit counts.
- Ghost variables: forced ETH, total funded, total withdrawn, per-milestone settled flags. `MilestoneSettled` events are parsed to check that each settlement allocates exactly the milestone amount and happens once.
- The exact identity `balance == ledger + forced ETH` (ACC-4) catches leaks that the weaker `balance >= ledger` (ACC-5) would hide.

## Mutation check

Five deliberate bugs were injected into a copy of the contract, one at a time. The invariant suite caught all five:

| Injected bug | Caught by |
|---|---|
| 1 wei of phantom credit on settlement | ACC-1, ACC-4, ACC-5 |
| Client credit not zeroed on withdraw | ACC-1, ACC-4, ACC-5, ACC-7 |
| Timeout forgets to zero `locked` | ACC-3, ACC-4, ACC-5 |
| Default split loses the odd wei | ACC-3, ACC-6 |
| `endAfterCurrent` keeps the old `locked` | ACC-2, ACC-4, ACC-5 |

(Run locally with 32 runs x 150 calls per mutant. Not part of CI. To reproduce, change the contract line in a scratch copy and run the invariant suite.)

## Not covered

AUTH rules are covered by unit and fuzz tests, not by invariants. Gas figures are from the default optimizer settings and are indicative only. No testing was done against a live network.
