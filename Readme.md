# TrustLayer

Milestone-based ETH escrow for a client and a freelancer, with two nominated arbiters and deterministic timeout rules.

> **Unaudited portfolio project. Not production-ready. Do not use with real funds.**
> The design and a first implementation were produced with AI assistance; see "Authorship" below.

## What it does

A client creates an agreement with sequential milestones, each with a payment amount and committed hashes of the deliverable and acceptance criteria. The freelancer and both arbiters accept the exact terms (by passing the terms hash). The client funds the full amount. For each milestone the freelancer submits, the client approves, requests a revision, or disputes; arbiters resolve disputes; deadlines have deterministic outcomes. Payouts are pull-based.

Trust model in one line: **the contract enforces the rules and the accounting; it cannot judge work quality. Disputes rest on the arbiters' honesty, bounded to one milestone per ruling, with exits for both sides.**

## Design highlights

- **No admin of any kind.** No owner, pause, sweep, or upgrade path. This is a CI-enforced property.
- **Bounded loss.** Sequential milestones, a client `endAfterCurrent` exit, and freelancer timeouts bound any single bad ruling to one milestone.
- **Liveness by design.** A silence table covers every state; a milestone in dispute is always allocated within 28 days of opening.
- **One accounting law.** `funded = locked + credits + withdrawn` in every state, checked by invariant tests; plus an exact balance identity with forced-ETH ghost tracking.
- **No loops in exits.** Timeouts and early-end use an aggregate `locked` amount (about 49k gas with 20 milestones).
- **Pull payments with `withdraw(id, to)`**, so a rejecting contract wallet can redirect.

## Layout

```
src/TrustLayer.sol            the contract
test/TrustLayer.t.sol         unit tests (AC-* IDs in test names)
test/Fuzz.t.sol               fuzz tests
test/Adversarial.t.sol        reentrancy, reverting/gas-burning receivers, forced ETH, collusion, gas
test/invariant/               handler + invariants (ACC-1 .. ACC-8, SAFE-*)
script/Deploy.s.sol           deployment
docs/                         specification, threat model, decisions (start with docs/README.md)
```

## Run it

```bash
git init   # forge install needs a git repository
forge install foundry-rs/forge-std@v1.9.7 OpenZeppelin/openzeppelin-contracts@v5.1.0   # versions the tests were run against
forge build
forge test                      # all unit, fuzz, adversarial and invariant tests
FOUNDRY_PROFILE=ci forge test   # heavier fuzz/invariant settings, as in CI
```

Local deploy: `anvil` in one shell, then
`forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key <anvil key>`.
Sepolia: see the comments in `script/Deploy.s.sol` and `.env.example`.

## Status

| Phase | State |
|---|---|
| 0 Specification | done (`docs/`) |
| 1 to 3 Contract and tests | done: see `TESTING.md` |
| 4 CI and deployment scripts | written; the CI workflow has not yet run on GitHub, and nothing is deployed |
| 5 to 7 Frontend, testnet demo, video | not started |

## Known limitations

See `docs/README.md` and `SECURITY.md`. Notably: fixed timing windows, trusted human arbiters, no kill fee on `endAfterCurrent`, stranded forced ETH, and funds stay locked if both parties go silent on a submitted milestone.

## Authorship

The specification and implementation were developed with an AI assistant acting as mentor and engineer. The owner is responsible for understanding and defending every decision recorded in `docs/design-decisions.md`.