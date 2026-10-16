# TrustLayer: Design Documentation (Phase 0, final)

TrustLayer is a milestone-based ETH escrow protocol for a client and a freelancer, with two nominated arbiters.
**Status:** specification complete, no Solidity written yet. **Unaudited portfolio project. Not production-ready.**

## Reading order

| File | Purpose |
|---|---|
| `design-decisions.md` | Every decision, with rationale and trade-off. Start here. |
| `lifecycle.md` | States, phases, timing constants, diagrams |
| `transition-table.md` | Normative transition list (what the tests must match) |
| `invariants.md` | Accounting equations, safety rules, liveness properties, storage-vs-ghost list |
| `silence-table.md` | What happens if nobody acts, state by state |
| `worst-case-timeline.md` | Maximum time until funds are movable |
| `actors-and-trust.md` | Actors, trust assumptions, per-actor maximum loss |
| `user-stories.md` | Stories with acceptance-criteria IDs (`AC-*`) |
| `threat-test-matrix.md` | Threat -> mechanism -> AC/invariant -> test |
| `scenario-walkthroughs.md` | Worked scenarios, including collusion and failure cases |
| `glossary.md` | One definition per term |
| `storage-design.md` | Phase 1: storage layout on paper |

## Known limitations (summary)

- Fixed timing windows: every milestone must be deliverable in 14 days, and a revision response must come within 14 days.
- Arbitration is trusted human judgment. Colluding arbiters can award one disputed milestone to either side.
- The client may end the agreement after the current milestone at any time, with no kill fee.
- If both parties stay silent on a `Submitted` milestone, funds stay locked (both parties chose that).
- ETH sent to the contract outside `fund` is permanently stranded (no admin, no sweep).
- Hashes commit to criteria; they do not prove work quality, and are useless without the preimage document.