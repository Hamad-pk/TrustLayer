# Actors and Trust Assumptions

## Actors

- **Client:** creates the agreement, funds it, reviews work, may dispute, and may end the agreement after the current milestone.
- **Freelancer:** accepts the terms, submits work, may escalate to arbitration, and withdraws their credit.
- **Primary and fallback arbiters:** opt in on-chain. Each may decide one disputed milestone in its own window. Neither can receive funds.
- **Any account:** may trigger deterministic timeouts and the default split. Gets nothing for doing so.
- **Contract:** enforces rules and accounting. No owner or admin exists.

## Worst case per actor

| Actor | Worst thing they can do | Maximum loss to the counterparty | What limits it |
|---|---|---|---|
| Client (alone) | Reject good work, stay silent, or request endless revisions | At most the current milestone, via arbitration. With failed arbiters, 50% of it | Settled milestones are final. The freelancer can escalate immediately, and can stop working |
| Freelancer (alone) | Submit junk, or never deliver | Nothing is lost on non-delivery (refund after 14d). With junk plus failed arbiters, 50% of the current milestone | The client can dispute at once and can end the agreement after the current milestone |
| Primary or fallback arbiter | Rule for one side, or stay silent | The full disputed milestone, once | One decision per milestone. No access to other milestones or agreements. Silence leads to fallback, then the 50/50 default |
| Client + arbiter colluding | Award disputed milestones to the client | One milestone per ruling. The freelancer who stops after the first bad ruling loses only that one | Freelancer exit by silence. Sequential milestones |
| Freelancer + arbiter colluding | Award junk milestones to the freelancer | One milestone per ruling. The client ends the agreement after the current one | `endAfterCurrent` refunds all future funds immediately |
| Third party | Trigger a deadline-based timeout when it is due. Send forced ETH | None (the outcome is fixed by rules and the caller gets nothing). Forced ETH is stranded | Permissionless actions are deterministic. Dispute opening is not permissionless |
| Compromised frontend | Display false terms or a different `to` | Anything the user signs blindly | Users can verify terms via `termsHash` and events. The UI must show the contract address and the verification steps |

## Trust assumptions

1. Participants control their own keys.
2. The EVM executes the deployed code correctly.
3. Arbiters are trusted to judge off-chain work. Their opt-in proves willingness at one moment, not competence or availability.
4. The contract cannot judge quality. Hashes commit to agreed documents, not to correctness.
5. **Preimage availability:** a hash is meaningful only if the acceptor obtained the underlying document. The UI must show it and the freelancer must read it before accepting.
6. A deadline passing does nothing without a mined transaction. Block timestamps are coarse.
7. The frontend is not a source of truth. It must display values read from the contract.
8. Distinct addresses can still be controlled by one person or by colluders. This cannot be detected on-chain.

## Security boundaries

No owner, pause, sweep, override, upgrade, or terms-edit function exists. This is a testable property (AUTH-8).

## Cannot be guaranteed

Quality of off-chain work, honesty of any actor, fairness of a default outcome in a specific case, protection from every implementation defect, recovery of ETH sent by mistake or by force, recovery of a lost key.