# TrustLayer

![CI](https://github.com/Hamad-pk/TrustLayer/actions/workflows/ci.yml/badge.svg)

Milestone-based ETH escrow for a client and a freelancer, with two nominated arbiters and deterministic timeout rules.

> **Unaudited portfolio project. Not production-ready. Do not use with real funds.**
> The design and a first implementation were produced with AI assistance; see "Authorship" below.

## What it does

A client creates an agreement with sequential milestones, each with a payment amount and committed hashes of the deliverable and acceptance criteria. The freelancer and both arbiters accept the exact terms (by passing the terms hash). The client funds the full amount. For each milestone the freelancer submits, and the client approves, requests a revision, or disputes. Arbiters resolve disputes, and every deadline has a deterministic outcome. Payouts are pull-based.

Trust model in one line: **the contract enforces the rules and the accounting; it cannot judge work quality. Disputes rest on the arbiters' honesty, bounded to one milestone per ruling, with exits for both sides.**

## Live deployment (Sepolia testnet)

| | |
|---|---|
| Contract | [`0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299`](https://sepolia.etherscan.io/address/0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299#code) |
| Source | Verified on Etherscan |
| Deployment tx | [`0xcb1bd9…5d55`](https://sepolia.etherscan.io/tx/0xcb1bd9102d58cb2532ba9dc15aa2bda0f8de36f740c1f9e54a9cff7d14bb5d55) (block 11932110) |
| Chain | Sepolia (chain ID 11155111) |
| Compiler | solc 0.8.28, optimizer 200 runs, EVM `cancun` |

### Deployment note: gas on Sepolia after Glamsterdam

Deploying this contract used about **17.1M gas** on Sepolia, against about **2.4M** in local simulation. It was likely due to Sepolia activating the Glamsterdam upgrade on 6 October 2026, which includes EIP-8037 and raises contract-deployment costs. Foundry's local simulation does not model this, so the first two deployment attempts ran out of gas. The successful deployment used `--gas-estimate-multiplier 1000`. The cost on Sepolia is negligible, and the contract code is unchanged.

## Design highlights

- **No admin of any kind.** No owner, pause, sweep or upgrade path. CI enforces this.
- **Bounded loss.** Sequential milestones, a client `endAfterCurrent` exit, and freelancer timeouts limit any single bad ruling to one milestone.
- **Liveness by design.** A silence table covers every state, and a disputed milestone is always allocated within 28 days of opening.
- **One accounting law.** `funded = locked + credits + withdrawn` holds in every state and is checked by invariant tests, alongside an exact balance identity that tracks forced ETH.
- **No loops in exits.** Timeouts and early-end use an aggregate `locked` amount (about 49k gas with 20 milestones).
- **Pull payments with `withdraw(id, to)`**, so a rejecting contract wallet can redirect its payout.

## Layout

```
src/TrustLayer.sol            the contract
test/TrustLayer.t.sol         unit tests (AC-* IDs in test names)
test/Fuzz.t.sol               fuzz tests
test/Adversarial.t.sol        reentrancy, reverting and gas-burning receivers, forced ETH, collusion, gas
test/invariant/               handler and invariants (ACC-1 to ACC-8, SAFE-*)
script/Deploy.s.sol           deployment script
docs/                         specification, threat model, decisions (start with docs/README.md)
SECURITY.md                   static analysis triage and known weaknesses
TESTING.md                    what each test level proves, plus the mutation check
```

## Run it

```bash
git init   # forge install needs a git repository
forge install foundry-rs/forge-std@v1.9.7 OpenZeppelin/openzeppelin-contracts@v5.1.0   # versions the tests were run against
forge build
forge test                      # all unit, fuzz, adversarial and invariant tests
FOUNDRY_PROFILE=ci forge test   # heavier fuzz and invariant settings, as in CI
```

Local deployment: run `anvil` in one shell, then
`forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key <anvil key>`.

Sepolia: see the comments in `script/Deploy.s.sol` and `.env.example`. Use a Foundry keystore (`cast wallet import`) instead of a private key in `.env`, and add `--gas-estimate-multiplier 1000` (see the deployment note above).

## Status

| Phase | State |
|---|---|
| 0. Specification | Done (`docs/`) |
| 1 to 3. Contract and tests | Done (see `TESTING.md`) |
| 4. CI and deployment | Done. CI is green, and the contract is deployed and verified on Sepolia |
| 5 to 7. Frontend, demo transactions, video | Not started |

## Known limitations

See `docs/README.md` and `SECURITY.md`. In short: fixed timing windows, trusted human arbiters, no kill fee on `endAfterCurrent`, stranded forced ETH, and funds stay locked if both parties go silent on a submitted milestone.

## Authorship

The specification and a first implementation were developed with an AI assistant acting as mentor and engineer. I deployed, tested and verified the contract myself, and I am responsible for understanding and defending every decision recorded in `docs/design-decisions.md`.