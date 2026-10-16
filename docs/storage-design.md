# Phase 1: Storage Design (paper only)

Principle: store only what logic needs to enforce rules. Put history in events.

## Per agreement (one struct, mapping by id)

| Field | Purpose | Notes |
|---|---|---|
| `client`, `freelancer`, `primaryArbiter`, `fallbackArbiter` | participants | immutable after create |
| `status` (enum, 4 values) | lifecycle | 1 byte |
| `phase` (enum, 4 values) | current-milestone phase | 1 byte |
| `currentIndex`, `endIndex`, `count` | execution pointers | `uint8` each (max 20) |
| `freelancerAccepted`, `primaryAccepted`, `fallbackAccepted` | funding gate | bools |
| `phaseDeadline` | deadline for the current phase | `uint40` timestamp |
| `disputeOpenedAt` | arbitration windows | `uint40`. Zero when not disputed |
| `locked` | reserved ETH | `uint128` |
| `clientCredit`, `freelancerCredit` | outstanding credits | `uint128` each |
| `termsHash` | acceptance binding | `bytes32` |

## Per milestone

| Field | Stored? | Why |
|---|---|---|
| `amount` | **Yes** (array of `uint128` per agreement) | Needed at settlement and for ACC-2 |
| Deliverable hash, criteria hash | **No.** Emitted in `AgreementCreated`, committed in `termsHash` | Saves about two slots per milestone. Trade-off: not directly readable from storage |
| Status | **No.** Derived from `currentIndex`, `endIndex`, `status` and `phase` | Avoids a second source of truth |
| Outcome (who got what) | **No.** `MilestoneSettled` event | History belongs in logs |

## Events only

Evidence hashes, revision reason hashes, who opened a dispute, and settlement amounts and reasons. The UI and arbiters read them from logs.

## Global

`nextAgreementId` only. No totals. Aggregate solvency is checked by the test handler summing per-agreement values.

## Questions to answer when you implement

1. Does the struct pack into few enough slots to matter? Check with `forge inspect ... storageLayout`.
2. Is `uint128` for ETH amounts safe, and where must you cast or check?
3. Should the view function return the struct or fields? Think about what the frontend needs in one call.
4. Which events need indexed fields for log queries (agreement id, participants)?
5. Where does `endIndex` get initialised, and what proves it never increases (SAFE-4)?
