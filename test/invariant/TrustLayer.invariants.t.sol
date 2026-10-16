// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {TrustLayer} from "../../src/TrustLayer.sol";
import {Handler} from "./Handler.sol";

/// @notice Stateful invariant tests: the accounting laws from docs/invariants.md must hold in every reachable state.
contract TrustLayerInvariants is Test {
    TrustLayer internal tl;
    Handler internal h;

    function setUp() public {
        tl = new TrustLayer();
        h = new Handler(tl);

        targetContract(address(h));
        // Weighted selection: `advance` is the workhorse; the raw actions keep some invalid-call noise.
        bytes4[] memory sel = new bytes4[](8);
        sel[0] = Handler.createAndFund.selector;
        sel[1] = Handler.createAndCancel.selector;
        sel[2] = Handler.advance.selector;
        sel[3] = Handler.advance.selector; // double weight: the state-aware workhorse
        sel[4] = Handler.advance.selector;
        sel[5] = Handler.withdraw.selector;
        sel[6] = Handler.forceEth.selector;
        sel[7] = Handler.advance.selector;
        targetSelector(FuzzSelector({addr: address(h), selectors: sel}));
    }

    function _liabilities() internal view returns (uint256 sum) {
        uint256[] memory ids = h.ids();
        for (uint256 i; i < ids.length; ++i) {
            TrustLayer.Agreement memory a = tl.getAgreement(ids[i]);
            sum += uint256(a.locked) + a.clientCredit + a.freelancerCredit;
        }
    }

    /// ACC-1: funded = locked + outstanding credits + withdrawn, for every agreement, in every state.
    function invariant_ACC1_universalConservation() public view {
        uint256[] memory ids = h.ids();
        for (uint256 i; i < ids.length; ++i) {
            TrustLayer.Agreement memory a = tl.getAgreement(ids[i]);
            assertEq(
                h.ghostFunded(ids[i]),
                uint256(a.locked) + a.clientCredit + a.freelancerCredit + h.ghostWithdrawn(ids[i]),
                "ACC-1"
            );
        }
    }

    /// ACC-2: while Active, locked is exactly the sum of the not-yet-settled effective milestone amounts.
    /// ACC-3: terminal or unfunded agreements hold nothing locked.
    function invariant_ACC2_ACC3_lockedIdentity() public view {
        uint256[] memory ids = h.ids();
        for (uint256 i; i < ids.length; ++i) {
            TrustLayer.Agreement memory a = tl.getAgreement(ids[i]);
            if (a.status == TrustLayer.Status.Active) {
                uint128[] memory amts = tl.getMilestoneAmounts(ids[i]);
                uint256 sum;
                for (uint256 k = a.currentIndex; k <= a.endIndex; ++k) {
                    sum += amts[k];
                }
                assertEq(a.locked, sum, "ACC-2");
            } else {
                assertEq(a.locked, 0, "ACC-3");
            }
        }
    }

    /// ACC-4: with forced ETH tracked as a ghost, the contract balance equals its ledger exactly.
    /// A leak of 1 wei would be caught here even though ACC-5 (>=) would still pass.
    function invariant_ACC4_exactBalanceIdentity() public view {
        assertEq(address(tl).balance, _liabilities() + h.ghostForced(), "ACC-4");
    }

    /// ACC-5: the weaker, on-chain-meaningful solvency relation.
    function invariant_ACC5_solvency() public view {
        assertGe(address(tl).balance, _liabilities(), "ACC-5");
    }

    /// ACC-6 and SAFE-3: every settlement allocates exactly the milestone amount, and each milestone settles once.
    function invariant_ACC6_SAFE3_settlements() public view {
        assertFalse(h.settlementMismatch(), "ACC-6");
        assertFalse(h.doubleSettled(), "SAFE-3");
    }

    /// SAFE-1, SAFE-2, SAFE-4: monotonic progress.
    function invariant_SAFE_monotonicity() public view {
        assertFalse(h.statusRegressed(), "SAFE-1");
        assertFalse(h.indexRegressed(), "SAFE-2");
        assertFalse(h.endIndexIncreased(), "SAFE-4");
    }

    /// SAFE-2 (bound) and SAFE-4: pointers stay within range; Completed means every effective milestone is settled.
    function invariant_pointerBounds_andCompletion() public view {
        uint256[] memory ids = h.ids();
        for (uint256 i; i < ids.length; ++i) {
            TrustLayer.Agreement memory a = tl.getAgreement(ids[i]);
            assertLe(a.currentIndex, uint256(a.endIndex) + 1, "currentIndex <= endIndex + 1");
            assertLt(a.endIndex, a.count, "endIndex < count");
            if (a.status == TrustLayer.Status.Completed) {
                assertEq(a.currentIndex, uint256(a.endIndex) + 1, "Completed => all effective milestones settled");
            }
            if (a.status == TrustLayer.Status.Proposed || a.status == TrustLayer.Status.Cancelled) {
                // an unfunded agreement has no credits; a cancelled one may
                if (h.ghostFunded(ids[i]) == 0) {
                    assertEq(uint256(a.clientCredit) + a.freelancerCredit, 0, "unfunded agreement has no credit");
                }
            }
        }
    }

    /// ACC-7: a successful withdrawal always zeroes the caller's credit.
    /// ACC-8: acting on one agreement never changes another.
    function invariant_ACC7_ACC8_withdrawalAndIsolation() public view {
        assertFalse(h.withdrawalLeftCredit(), "ACC-7");
        assertFalse(h.isolationBroken(), "ACC-8");
    }

    /// Prints which actions the fuzzer actually reached, so a passing run is not vacuous.
    function afterInvariant() public view {
        bytes32[] memory tags = h.tags();
        for (uint256 i; i < tags.length; ++i) {
            console.log(string(abi.encodePacked(tags[i])), h.hits(tags[i]));
        }
    }
}
