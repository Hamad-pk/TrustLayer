# Glossary

One definition per term.

- **Agreement:** One client-freelancer escrow with immutable terms and sequential milestones.
- **Milestone:** One unit of work and payment. Only the current milestone is active.
- **Current milestone:** The milestone at `currentIndex`.
- **Effective milestone:** A milestone at an index `<= endIndex`. Others are voided.
- **Eligible:** An action whose preconditions, including time, are satisfied now. Eligible does not mean executed.
- **Phase:** The sub-state of the current milestone: `Working`, `Submitted`, `RevisionRequested`, `Disputed`.
- **Locked:** ETH reserved for unsettled effective milestones. Not yet assigned to anyone.
- **Allocated:** Cumulative ETH assigned to the client or freelancer as credit, including amounts already withdrawn.
- **Credit:** ETH allocated and **not yet withdrawn** (outstanding credit).
- **Withdrawn:** Credit that has been transferred out.
- **Settled:** A milestone whose full amount has moved from locked to allocated. Settled does not mean withdrawn.
- **Voided:** A milestone that will never start because the agreement ended early.
- **Disputed amount:** The full amount of the current milestone while it is `Disputed`.
- **Terms hash:** An on-chain commitment (`abi.encode`, keccak256) to participants, arbiters, milestone amounts, deliverable hashes, criteria hashes, policy version, chain and contract.
- **Deliverable hash / criteria hash:** Commitments to off-chain documents describing the work and the acceptance criteria.
- **Evidence hash:** A commitment to a submission. It proves nothing about quality.
- **Policy version:** The number identifying the fixed rules and constants (currently 1).
- **Primary and fallback window:** The first and second 14-day arbitration periods.
- **Default split:** The deterministic client-floor-half, freelancer-remainder allocation after both windows lapse.
- **Forced ETH:** ETH that reaches the contract without calling `fund` (for example via `selfdestruct`). It is stranded.
- **Permissionless action:** An action any account may call. It gives the caller no funds and no choice over the outcome.
- **Pull payment:** The contract credits a beneficiary, who withdraws separately.
- **CEI:** Checks-Effects-Interactions. Validate, then update state, then make external calls.
- **Ghost variable:** A value tracked only in the test handler, not in contract storage.