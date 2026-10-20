# TrustLayer

**A milestone-based ETH escrow dApp for clients and freelancers, with two nominated arbiters and explicit timeout rules.**

[![CI](https://github.com/Hamad-pk/TrustLayer/actions/workflows/ci.yml/badge.svg)](https://github.com/Hamad-pk/TrustLayer/actions/workflows/ci.yml)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-blue)](https://docs.soliditylang.org/)
[![Network](https://img.shields.io/badge/Network-Sepolia-orange)](https://sepolia.etherscan.io/address/0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299#code)

> **Security notice:** TrustLayer is an unaudited portfolio project. It has not received an independent security audit or formal verification. Do not use it to hold real funds.

## Overview

TrustLayer models a freelance agreement as a sequence of funded milestones. The contract enforces the agreement's state transitions and payment accounting; it does **not** decide whether submitted work is good enough. Human arbiters make that judgment when a dispute is raised.

### Agreement lifecycle

1. **Create terms.** The client defines the freelancer, two distinct arbiters, and 1–20 milestones. Each milestone has an ETH amount plus hashes committing to the deliverable and acceptance criteria.
2. **Accept and fund.** The freelancer and both arbiters accept the same terms hash. The client then funds the exact total amount.
3. **Submit work.** The freelancer submits an evidence hash for the current milestone.
4. **Review.** The client can approve the milestone, request a revision, or open a dispute under the contract's rules.
5. **Resolve disputes.** The primary arbiter has the first 14-day window. The fallback arbiter has the next 14-day window. If neither rules in time, anyone can trigger a default 50/50 allocation for that milestone.
6. **Withdraw credits.** Settled funds become pull-based credits. The credited client or freelancer can withdraw to a chosen recipient address.

## Design goals

- **No privileged administrator:** no owner, pause, sweep, or upgrade mechanism.
- **Terms-bound acceptance:** the terms hash includes the chain ID, contract address, agreement ID, participants, policy version, and milestone inputs.
- **Explicit lifecycle rules:** submission, review, revision, arbitration, and fallback windows have defined behavior.
- **Limited ruling scope:** an arbiter allocates only the current milestone, not the agreement's entire remaining balance.
- **Pull payments:** `withdraw(id, to)` separates settlement from the external ETH transfer and allows a credited participant to choose a recipient.
- **Reentrancy protection:** withdrawals use OpenZeppelin's `ReentrancyGuard` and update credit state before sending ETH.
- **Tested accounting properties:** unit, fuzz, adversarial, and invariant tests exercise transitions, payment accounting, time boundaries, and hostile recipients.

## Sepolia deployment

| Field | Value |
|---|---|
| Network | Sepolia testnet |
| Chain ID | `11155111` |
| Contract | [`0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299`](https://sepolia.etherscan.io/address/0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299#code) |
| Verification | Source verified on Etherscan |
| Deployment transaction | [`0xcb1bd9102d58cb2532ba9dc15aa2bda0f8de36f740c1f9e54a9cff7d14bb5d55`](https://sepolia.etherscan.io/tx/0xcb1bd9102d58cb2532ba9dc15aa2bda0f8de36f740c1f9e54a9cff7d14bb5d55) |
| Compiler settings | Solidity `0.8.28`, optimizer enabled with 200 runs, EVM target `cancun` |

The deployment is for testnet demonstration only. It should not be interpreted as evidence of an audit or production readiness.

## Technology stack

- **Smart contracts:** Solidity `0.8.28`, Foundry, OpenZeppelin Contracts
- **Testing and analysis:** Foundry unit, fuzz, adversarial, and invariant tests; Slither; GitHub Actions CI
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, wagmi, viem, React Router, and Framer Motion

## Repository guide

```text
src/TrustLayer.sol              Escrow contract
script/Deploy.s.sol             Foundry deployment script
test/TrustLayer.t.sol            Unit and lifecycle tests
test/Fuzz.t.sol                  Fuzz tests
test/Adversarial.t.sol           Adversarial recipient, forced ETH, collusion, and gas tests
test/invariant/                  Stateful invariant tests
docs/                            Specification, design decisions, lifecycle, and threat model
TESTING.md                       Test levels, properties, and mutation-check notes
SECURITY.md                      Static-analysis triage and known limitations
frontend/                        React/TypeScript dApp interface
```

Start with [`docs/README.md`](docs/README.md) for the design-document reading order, [`TESTING.md`](TESTING.md) for test coverage, and [`SECURITY.md`](SECURITY.md) for the security scope and known weaknesses.

## Run locally

### Smart contracts

Clone the repository with its Git submodules:

```bash
git clone --recurse-submodules https://github.com/Hamad-pk/TrustLayer.git
cd TrustLayer
forge build
forge test
```

To run the heavier CI fuzz and invariant configuration:

```bash
FOUNDRY_PROFILE=ci forge test
```

The CI workflow also checks formatting, contract size, gas snapshots, and selected security invariants. A successful test run is useful evidence, but it is not a security audit.

### Frontend

```bash
cd frontend
npm ci
cp .env.example .env.local
```

Set `VITE_SEPOLIA_RPC_URL` in `frontend/.env.local` to a Sepolia RPC endpoint if you want to use your own provider. Then run:

```bash
npm run dev
```

Create a production build and run the configured linter with:

```bash
npm run build
npm run lint
```

The frontend is configured for Sepolia and a local Foundry/Anvil chain. Never put wallet private keys or other secrets in a `VITE_*` variable; Vite exposes those values to browser code.

## Security assumptions and known limitations

- **Arbiters are trusted humans.** They can be unavailable or dishonest. The default split handles failure to rule, but it cannot guarantee a fair decision.
- **No automatic judgment of work quality.** Hashes commit to documents; they do not prove that work meets the criteria. The underlying documents must be shared and retained off-chain.
- **Fixed timing windows.** The protocol is not suitable for every kind of freelance engagement or delivery schedule.
- **No freelancer kill fee.** The client can end an agreement after the current milestone and receive the funds reserved for future milestones.
- **Submitted work can remain locked if both parties do nothing.** The contract deliberately does not automatically approve or reject a submission solely because the client is silent.
- **Forced ETH is not recoverable.** ETH sent to the contract outside the intended funding path can become permanently stranded; there is no admin sweep function.
- **No recovery mechanism.** Lost participant keys can make associated credits inaccessible.
- **No independent audit or formal verification.** Review [`SECURITY.md`](SECURITY.md) and the design docs before drawing conclusions about safety.

## Authorship

AI assistance was used during the specification and initial implementation. The repository includes the design rationale, threat model, tests, and deployment artifacts so the implementation can be inspected. I deployed and tested the contract and remain responsible for understanding and maintaining its behavior. AI assistance and automated tests are not substitutes for independent security review.
