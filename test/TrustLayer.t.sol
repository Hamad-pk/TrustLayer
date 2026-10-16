// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base} from "./Base.t.sol";
import {TrustLayer} from "../src/TrustLayer.sol";

/// @notice Unit tests. Names embed the acceptance-criteria IDs from docs/user-stories.md.
contract CreateTest is Base {
    function test_AC_CRE_1_rejectsZeroAndDuplicateParticipants() public {
        TrustLayer.MilestoneInput[] memory ms = _ms(1, uint128(ONE));
        vm.startPrank(client);
        vm.expectRevert(TrustLayer.InvalidParticipants.selector);
        tl.create(address(0), primary, fallbackArb, ms);
        vm.expectRevert(TrustLayer.InvalidParticipants.selector);
        tl.create(freelancer, address(0), fallbackArb, ms);
        vm.expectRevert(TrustLayer.InvalidParticipants.selector);
        tl.create(freelancer, primary, address(0), ms);
        vm.expectRevert(TrustLayer.InvalidParticipants.selector);
        tl.create(client, primary, fallbackArb, ms); // client == freelancer
        vm.expectRevert(TrustLayer.InvalidParticipants.selector);
        tl.create(freelancer, client, fallbackArb, ms); // client == primary
        vm.expectRevert(TrustLayer.InvalidParticipants.selector);
        tl.create(freelancer, primary, client, ms); // client == fallback
        vm.expectRevert(TrustLayer.InvalidParticipants.selector);
        tl.create(freelancer, freelancer, fallbackArb, ms); // freelancer == primary
        vm.expectRevert(TrustLayer.InvalidParticipants.selector);
        tl.create(freelancer, primary, freelancer, ms); // freelancer == fallback
        vm.expectRevert(TrustLayer.InvalidParticipants.selector);
        tl.create(freelancer, primary, primary, ms); // primary == fallback
        vm.stopPrank();
    }

    function test_AC_CRE_2_milestoneCountBounds() public {
        vm.startPrank(client);
        vm.expectRevert(TrustLayer.InvalidMilestoneCount.selector);
        tl.create(freelancer, primary, fallbackArb, _ms(0, 1));
        vm.expectRevert(TrustLayer.InvalidMilestoneCount.selector);
        tl.create(freelancer, primary, fallbackArb, _ms(21, 1));
        assertEq(tl.create(freelancer, primary, fallbackArb, _ms(1, 1)), 1);
        assertEq(tl.create(freelancer, primary, fallbackArb, _ms(20, 1)), 2);
        vm.stopPrank();
    }

    function test_AC_CRE_3_zeroAmountAndOverflowRevert() public {
        TrustLayer.MilestoneInput[] memory ms = _ms(2, uint128(ONE));
        ms[1].amount = 0;
        vm.prank(client);
        vm.expectRevert(TrustLayer.InvalidAmount.selector);
        tl.create(freelancer, primary, fallbackArb, ms);

        TrustLayer.MilestoneInput[] memory big = _ms(2, type(uint128).max);
        vm.prank(client);
        vm.expectRevert(TrustLayer.TotalTooLarge.selector);
        tl.create(freelancer, primary, fallbackArb, big);
    }

    function test_AC_CRE_4_zeroHashesRevert() public {
        TrustLayer.MilestoneInput[] memory ms = _ms(1, uint128(ONE));
        ms[0].deliverableHash = bytes32(0);
        vm.prank(client);
        vm.expectRevert(TrustLayer.InvalidHash.selector);
        tl.create(freelancer, primary, fallbackArb, ms);

        ms = _ms(1, uint128(ONE));
        ms[0].criteriaHash = bytes32(0);
        vm.prank(client);
        vm.expectRevert(TrustLayer.InvalidHash.selector);
        tl.create(freelancer, primary, fallbackArb, ms);
    }

    function test_AC_CRE_5_termsHashMatchesIndependentComputation() public {
        TrustLayer.MilestoneInput[] memory ms = _ms(3, uint128(ONE));
        vm.prank(client);
        uint256 id = tl.create(freelancer, primary, fallbackArb, ms);
        bytes32 expected = keccak256(
            abi.encode(block.chainid, address(tl), id, client, freelancer, primary, fallbackArb, uint256(1), ms)
        );
        assertEq(_a(id).termsHash, expected);
        assertEq(tl.computeTermsHash(id, client, freelancer, primary, fallbackArb, ms), expected);
    }

    function test_AC_CRE_5_termsHashChangesWithAnyTerm() public view {
        TrustLayer.MilestoneInput[] memory ms = _ms(2, uint128(ONE));
        bytes32 h0 = tl.computeTermsHash(1, client, freelancer, primary, fallbackArb, ms);
        ms[1].amount += 1;
        assertTrue(h0 != tl.computeTermsHash(1, client, freelancer, primary, fallbackArb, ms));
        ms[1].amount -= 1;
        ms[0].criteriaHash = keccak256("other");
        assertTrue(h0 != tl.computeTermsHash(1, client, freelancer, primary, fallbackArb, ms));
        // swapping arbiters changes the hash too
        ms = _ms(2, uint128(ONE));
        assertTrue(h0 != tl.computeTermsHash(1, client, freelancer, fallbackArb, primary, ms));
    }

    function test_creationStateAndTotals() public {
        uint256 id = _create(3, uint128(ONE));
        TrustLayer.Agreement memory a = _a(id);
        assertEq(uint256(a.status), uint256(TrustLayer.Status.Proposed));
        assertEq(a.total, 3 ether);
        assertEq(a.locked, 0);
        assertEq(a.endIndex, 2);
        assertEq(a.client, client);
    }
}

contract AcceptCancelFundTest is Base {
    function test_AC_ACC_1_onlyNamedRolesAccept() public {
        uint256 id = _create(1, uint128(ONE));
        bytes32 h = _a(id).termsHash;
        vm.prank(stranger);
        vm.expectRevert(TrustLayer.NotFreelancer.selector);
        tl.acceptAsFreelancer(id, h);
        vm.prank(client);
        vm.expectRevert(TrustLayer.NotFreelancer.selector);
        tl.acceptAsFreelancer(id, h);
        vm.prank(stranger);
        vm.expectRevert(TrustLayer.NotArbiter.selector);
        tl.acceptAsArbiter(id, h);
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.NotArbiter.selector);
        tl.acceptAsArbiter(id, h);
    }

    function test_AC_ACC_2_hashMismatchReverts() public {
        uint256 id = _create(1, uint128(ONE));
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.TermsMismatch.selector);
        tl.acceptAsFreelancer(id, keccak256("wrong"));
        vm.prank(primary);
        vm.expectRevert(TrustLayer.TermsMismatch.selector);
        tl.acceptAsArbiter(id, keccak256("wrong"));
        // a stranger with a wrong hash gets the role error, not a hash hint
        vm.prank(stranger);
        vm.expectRevert(TrustLayer.NotArbiter.selector);
        tl.acceptAsArbiter(id, keccak256("wrong"));
    }

    function test_AC_ACC_3_repeatAcceptanceReverts() public {
        uint256 id = _create(1, uint128(ONE));
        bytes32 h = _a(id).termsHash;
        vm.startPrank(freelancer);
        tl.acceptAsFreelancer(id, h);
        vm.expectRevert(TrustLayer.AlreadyAccepted.selector);
        tl.acceptAsFreelancer(id, h);
        vm.stopPrank();
        vm.startPrank(primary);
        tl.acceptAsArbiter(id, h);
        vm.expectRevert(TrustLayer.AlreadyAccepted.selector);
        tl.acceptAsArbiter(id, h);
        vm.stopPrank();
        vm.startPrank(fallbackArb);
        tl.acceptAsArbiter(id, h);
        vm.expectRevert(TrustLayer.AlreadyAccepted.selector);
        tl.acceptAsArbiter(id, h);
        vm.stopPrank();
    }

    function test_AC_ACC_4_acceptanceOnlyInProposed() public {
        uint256 id = _active(1, uint128(ONE));
        bytes32 h = _a(id).termsHash;
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.acceptAsFreelancer(id, h);
        vm.expectRevert(TrustLayer.AgreementNotFound.selector);
        tl.acceptAsFreelancer(999, h);
    }

    function test_AC_CNL_1_everyParticipantCanCancelBeforeFunding() public {
        address[4] memory who = [client, freelancer, primary, fallbackArb];
        for (uint256 i; i < 4; ++i) {
            uint256 id = _create(1, uint128(ONE));
            vm.prank(who[i]);
            tl.cancelBeforeFunding(id);
            assertEq(uint256(_a(id).status), uint256(TrustLayer.Status.Cancelled));
            assertEq(uint256(tl.milestoneStatus(id, 0)), uint256(TrustLayer.MilestoneStatus.Voided));
        }
    }

    function test_AC_CNL_1_strangerCannotCancel() public {
        uint256 id = _create(1, uint128(ONE));
        vm.prank(stranger);
        vm.expectRevert(TrustLayer.NotParticipant.selector);
        tl.cancelBeforeFunding(id);
    }

    function test_AC_CNL_2_cannotCancelAfterFundingOrTwice() public {
        uint256 id = _active(1, uint128(ONE));
        vm.prank(client);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.cancelBeforeFunding(id);

        uint256 id2 = _create(1, uint128(ONE));
        vm.startPrank(client);
        tl.cancelBeforeFunding(id2);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.cancelBeforeFunding(id2);
        vm.stopPrank();
    }

    function test_AC_FUND_1_onlyClientFunds() public {
        uint256 id = _create(1, uint128(ONE));
        _acceptAll(id);
        vm.deal(stranger, 10 ether);
        vm.prank(stranger);
        vm.expectRevert(TrustLayer.NotClient.selector);
        tl.fund{value: ONE}(id);
    }

    function test_AC_FUND_2_requiresEveryAcceptance() public {
        // each of the three flags missing in turn
        for (uint256 skip; skip < 3; ++skip) {
            uint256 id = _create(1, uint128(ONE));
            bytes32 h = _a(id).termsHash;
            if (skip != 0) {
                vm.prank(freelancer);
                tl.acceptAsFreelancer(id, h);
            }
            if (skip != 1) {
                vm.prank(primary);
                tl.acceptAsArbiter(id, h);
            }
            if (skip != 2) {
                vm.prank(fallbackArb);
                tl.acceptAsArbiter(id, h);
            }
            vm.prank(client);
            vm.expectRevert(TrustLayer.NotAllAccepted.selector);
            tl.fund{value: ONE}(id);
        }
    }

    function test_AC_FUND_3_exactValueOnly() public {
        uint256 id = _create(2, uint128(ONE));
        _acceptAll(id);
        vm.startPrank(client);
        vm.expectRevert(TrustLayer.WrongFundingAmount.selector);
        tl.fund{value: 2 ether - 1}(id);
        vm.expectRevert(TrustLayer.WrongFundingAmount.selector);
        tl.fund{value: 2 ether + 1}(id);
        vm.expectRevert(TrustLayer.WrongFundingAmount.selector);
        tl.fund(id);
        vm.stopPrank();
    }

    function test_AC_FUND_4_onlyOnce() public {
        uint256 id = _active(1, uint128(ONE));
        vm.prank(client);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.fund{value: ONE}(id);
    }

    function test_AC_FUND_5_firstMilestoneActivated() public {
        uint256 id = _active(2, uint128(ONE));
        TrustLayer.Agreement memory a = _a(id);
        assertEq(uint256(a.status), uint256(TrustLayer.Status.Active));
        assertEq(uint256(a.phase), uint256(TrustLayer.Phase.Working));
        assertEq(a.phaseDeadline, block.timestamp + 14 days);
        assertEq(a.locked, 2 ether);
        assertEq(address(tl).balance, 2 ether);
        assertEq(uint256(tl.milestoneStatus(id, 0)), uint256(TrustLayer.MilestoneStatus.Working));
        assertEq(uint256(tl.milestoneStatus(id, 1)), uint256(TrustLayer.MilestoneStatus.Pending));
    }

    function test_directEthTransferReverts() public {
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        (bool ok,) = address(tl).call{value: 1 wei}("");
        assertFalse(ok);
    }
}

contract WorkTest is Base {
    uint256 id;

    function setUp() public override {
        super.setUp();
        id = _active(3, uint128(ONE));
    }

    // ---- submit
    function test_AC_SUB_1_onlyFreelancerSubmits() public {
        vm.prank(client);
        vm.expectRevert(TrustLayer.NotFreelancer.selector);
        tl.submit(id, keccak256("e"));
        vm.prank(stranger);
        vm.expectRevert(TrustLayer.NotFreelancer.selector);
        tl.submit(id, keccak256("e"));
    }

    function test_AC_SUB_2_wrongPhaseReverts() public {
        _submit(id);
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.submit(id, keccak256("again")); // already Submitted
    }

    function test_AC_SUB_3_strictDeadlineBoundary() public {
        uint256 deadline = _a(id).phaseDeadline;
        vm.warp(deadline - 1);
        _submit(id); // ok at deadline - 1

        uint256 id2 = _active(1, uint128(ONE));
        deadline = _a(id2).phaseDeadline;
        vm.warp(deadline);
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.DeadlinePassed.selector);
        tl.submit(id2, keccak256("e"));
        vm.warp(deadline + 1);
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.DeadlinePassed.selector);
        tl.submit(id2, keccak256("e"));
    }

    function test_AC_SUB_4_zeroEvidenceReverts() public {
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.InvalidHash.selector);
        tl.submit(id, bytes32(0));
    }

    function test_AC_SUB_5_reviewDeadlineIsSevenDays() public {
        _submit(id);
        TrustLayer.Agreement memory a = _a(id);
        assertEq(uint256(a.phase), uint256(TrustLayer.Phase.Submitted));
        assertEq(a.phaseDeadline, block.timestamp + 7 days);
    }

    // ---- approve
    function test_AC_APP_1_onlyClientApproves() public {
        _submit(id);
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.NotClient.selector);
        tl.approve(id);
        vm.prank(stranger);
        vm.expectRevert(TrustLayer.NotClient.selector);
        tl.approve(id);
    }

    function test_AC_APP_2_approveRequiresSubmitted() public {
        vm.prank(client);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.approve(id); // Working
    }

    function test_AC_APP_2_lateApprovalAllowedUntilDispute() public {
        _submit(id);
        vm.warp(block.timestamp + 30 days); // far past the review deadline
        _approve(id);
        assertEq(_a(id).freelancerCredit, uint128(ONE));
    }

    function test_AC_APP_3_APP_4_creditsOnceAndAdvances() public {
        _submit(id);
        _approve(id);
        TrustLayer.Agreement memory a = _a(id);
        assertEq(a.freelancerCredit, uint128(ONE));
        assertEq(a.clientCredit, 0);
        assertEq(a.locked, 2 ether);
        assertEq(a.currentIndex, 1);
        assertEq(uint256(a.phase), uint256(TrustLayer.Phase.Working));
        assertEq(a.phaseDeadline, block.timestamp + 14 days);
        assertEq(uint256(tl.milestoneStatus(id, 0)), uint256(TrustLayer.MilestoneStatus.Settled));
        // repeat approval reverts (phase is Working again)
        vm.prank(client);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.approve(id);
    }

    function test_completionIsAtomicOnLastApproval() public {
        for (uint256 i; i < 3; ++i) {
            _submit(id);
            _approve(id);
        }
        TrustLayer.Agreement memory a = _a(id);
        assertEq(uint256(a.status), uint256(TrustLayer.Status.Completed));
        assertEq(a.locked, 0);
        assertEq(a.freelancerCredit, 3 ether);
        assertEq(a.currentIndex, 3);
    }

    // ---- revisions
    function test_AC_REV_1_to_4() public {
        _submit(id);
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.NotClient.selector);
        tl.requestRevision(id, keccak256("r"));
        vm.prank(client);
        vm.expectRevert(TrustLayer.InvalidHash.selector);
        tl.requestRevision(id, bytes32(0));

        vm.prank(client);
        tl.requestRevision(id, keccak256("r"));
        TrustLayer.Agreement memory a = _a(id);
        assertEq(uint256(a.phase), uint256(TrustLayer.Phase.RevisionRequested));
        assertEq(a.phaseDeadline, block.timestamp + 14 days);
    }

    function test_AC_REV_2_noRevisionAfterReviewDeadline() public {
        _submit(id);
        uint256 deadline = _a(id).phaseDeadline;
        vm.warp(deadline);
        vm.prank(client);
        vm.expectRevert(TrustLayer.DeadlinePassed.selector);
        tl.requestRevision(id, keccak256("r"));
    }

    function test_AC_REV_5_noRevisionLimit_andIdenticalResubmissionAllowed() public {
        for (uint256 i; i < 6; ++i) {
            _submit(id); // identical evidence every time
            vm.prank(client);
            tl.requestRevision(id, keccak256(abi.encode(i)));
        }
        assertEq(uint256(_a(id).phase), uint256(TrustLayer.Phase.RevisionRequested));
        _submit(id);
        _approve(id);
        assertEq(_a(id).freelancerCredit, uint128(ONE));
    }

    function test_resubmitBoundaryAtRevisionDeadline() public {
        _submit(id);
        vm.prank(client);
        tl.requestRevision(id, keccak256("r"));
        uint256 deadline = _a(id).phaseDeadline;
        vm.warp(deadline - 1);
        _submit(id); // ok

        vm.prank(client);
        tl.requestRevision(id, keccak256("r2"));
        deadline = _a(id).phaseDeadline;
        vm.warp(deadline);
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.DeadlinePassed.selector);
        tl.submit(id, keccak256("late"));
    }
}

contract DisputeTest is Base {
    uint256 id;

    function setUp() public override {
        super.setUp();
        id = _active(3, 3 ether);
        _submit(id);
    }

    function test_AC_DIS_1_clientCanDisputeAnyTimeWhenSubmitted() public {
        _clientDispute(id);
        TrustLayer.Agreement memory a = _a(id);
        assertEq(uint256(a.phase), uint256(TrustLayer.Phase.Disputed));
        assertEq(a.disputeOpenedAt, block.timestamp);
    }

    function test_AC_DIS_2_freelancerOnlyAfterReviewDeadline() public {
        uint256 deadline = _a(id).phaseDeadline;
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.DeadlineNotReached.selector);
        tl.openDispute(id);
        vm.warp(deadline - 1);
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.DeadlineNotReached.selector);
        tl.openDispute(id);
        vm.warp(deadline);
        vm.prank(freelancer);
        tl.openDispute(id);
        assertEq(uint256(_a(id).phase), uint256(TrustLayer.Phase.Disputed));
    }

    function test_AC_DIS_2_freelancerCanContestRevisionAnytime() public {
        vm.prank(client);
        tl.requestRevision(id, keccak256("r"));
        vm.prank(freelancer);
        tl.openDispute(id);
        assertEq(uint256(_a(id).phase), uint256(TrustLayer.Phase.Disputed));
    }

    function test_AC_DIS_2_clientCannotDisputeRevisionRequested() public {
        vm.prank(client);
        tl.requestRevision(id, keccak256("r"));
        vm.prank(client);
        vm.expectRevert(TrustLayer.NotAuthorized.selector);
        tl.openDispute(id);
    }

    function test_AC_DIS_3_noOtherAccountMayOpen() public {
        vm.warp(block.timestamp + 365 days);
        address[3] memory others = [stranger, primary, fallbackArb];
        for (uint256 i; i < 3; ++i) {
            vm.prank(others[i]);
            vm.expectRevert(TrustLayer.NotAuthorized.selector);
            tl.openDispute(id);
        }
    }

    function test_AC_DIS_3_cannotOpenWhileWorkingOrAlreadyDisputed() public {
        _clientDispute(id);
        vm.prank(client);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.openDispute(id);
        // next milestone in Working phase
        uint256 id2 = _active(1, uint128(ONE));
        vm.prank(client);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.openDispute(id2);
    }

    function test_AC_DIS_4_disputeFreezesNormalActions() public {
        _clientDispute(id);
        vm.prank(client);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.approve(id);
        vm.prank(client);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.requestRevision(id, keccak256("r"));
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.submit(id, keccak256("e"));
        vm.prank(stranger);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.expireFreelancerWindow(id);
    }

    // ---- resolution
    function test_AC_RES_1_primaryOnlyInPrimaryWindow() public {
        _clientDispute(id);
        uint256 opened = block.timestamp;
        vm.prank(fallbackArb);
        vm.expectRevert(TrustLayer.NotArbiter.selector);
        tl.resolve(id, 1 ether);
        vm.prank(stranger);
        vm.expectRevert(TrustLayer.NotArbiter.selector);
        tl.resolve(id, 1 ether);

        vm.warp(opened + 14 days - 1);
        vm.prank(primary);
        tl.resolve(id, 1 ether);
        assertEq(_a(id).freelancerCredit, 1 ether);
        assertEq(_a(id).clientCredit, 2 ether);
    }

    function test_AC_RES_1_primaryExpiredAtExactBoundary() public {
        _clientDispute(id);
        vm.warp(block.timestamp + 14 days);
        vm.prank(primary);
        vm.expectRevert(TrustLayer.NotArbiter.selector);
        tl.resolve(id, 1 ether);
    }

    function test_AC_RES_2_fallbackOnlyInFallbackWindow() public {
        _clientDispute(id);
        uint256 opened = block.timestamp;
        vm.warp(opened + 14 days);
        vm.prank(fallbackArb);
        tl.resolve(id, 3 ether);
        assertEq(_a(id).freelancerCredit, 3 ether);
        assertEq(uint256(tl.milestoneStatus(id, 0)), uint256(TrustLayer.MilestoneStatus.Settled));
    }

    function test_AC_RES_2_fallbackExpiredAtExactBoundary() public {
        _clientDispute(id);
        vm.warp(block.timestamp + 28 days);
        vm.prank(fallbackArb);
        vm.expectRevert(TrustLayer.WindowNotOpen.selector);
        tl.resolve(id, 1 ether);
        vm.prank(primary);
        vm.expectRevert(TrustLayer.WindowNotOpen.selector);
        tl.resolve(id, 1 ether);
    }

    function test_AC_RES_3_allocationBound() public {
        _clientDispute(id);
        vm.prank(primary);
        vm.expectRevert(TrustLayer.InvalidAllocation.selector);
        tl.resolve(id, 3 ether + 1);
        // extremes are valid
        vm.prank(primary);
        tl.resolve(id, 0);
        assertEq(_a(id).clientCredit, 3 ether);
    }

    function test_AC_RES_4_arbitersNeverCredited() public {
        uint256 pBal = primary.balance;
        uint256 fBal = fallbackArb.balance;
        _clientDispute(id);
        vm.prank(primary);
        tl.resolve(id, 1 ether);
        vm.prank(primary);
        vm.expectRevert(TrustLayer.NotParticipant.selector);
        tl.withdraw(1, primary);
        assertEq(primary.balance, pBal);
        assertEq(fallbackArb.balance, fBal);
    }

    function test_AC_RES_5_defaultSplitBoundaryAndOddWei() public {
        uint256 odd = _active(1, 7 wei);
        _submit(odd);
        _clientDispute(odd);
        uint256 opened = block.timestamp;

        vm.warp(opened + 28 days - 1);
        vm.prank(stranger);
        vm.expectRevert(TrustLayer.DeadlineNotReached.selector);
        tl.defaultSplit(odd);

        vm.warp(opened + 28 days);
        uint256 callerBalBefore = stranger.balance;
        vm.prank(stranger);
        tl.defaultSplit(odd);
        TrustLayer.Agreement memory a = _a(odd);
        assertEq(a.clientCredit, 3);
        assertEq(a.freelancerCredit, 4); // freelancer takes the odd wei
        assertEq(stranger.balance, callerBalBefore); // AC-TMO-5 analogue: caller gets nothing
        assertEq(uint256(a.status), uint256(TrustLayer.Status.Completed));
    }

    function test_AC_RES_6_settlesOnce() public {
        _clientDispute(id);
        vm.prank(primary);
        tl.resolve(id, 1 ether);
        // next milestone is Working; resolve / defaultSplit both revert
        vm.prank(primary);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.resolve(id, 1 ether);
        vm.warp(block.timestamp + 100 days);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.defaultSplit(id);
    }

    function test_approveVsDisputeRace_approveFirst() public {
        vm.warp(_a(id).phaseDeadline + 1);
        _approve(id);
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.openDispute(id);
    }

    function test_approveVsDisputeRace_disputeFirst() public {
        vm.warp(_a(id).phaseDeadline + 1);
        vm.prank(freelancer);
        tl.openDispute(id);
        vm.prank(client);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.approve(id);
    }
}

contract ExitTest is Base {
    // ---- freelancer inactivity
    function test_AC_TMO_workingTimeoutRefundsEverything() public {
        uint256 id = _active(3, uint128(ONE));
        uint256 deadline = _a(id).phaseDeadline;

        vm.warp(deadline - 1);
        vm.prank(stranger);
        vm.expectRevert(TrustLayer.DeadlineNotReached.selector);
        tl.expireFreelancerWindow(id);

        vm.warp(deadline);
        uint256 callerBal = stranger.balance;
        vm.prank(stranger);
        tl.expireFreelancerWindow(id);

        TrustLayer.Agreement memory a = _a(id);
        assertEq(a.clientCredit, 3 ether, "AC-TMO-3");
        assertEq(a.freelancerCredit, 0, "freelancer paid nothing for doing nothing");
        assertEq(a.locked, 0);
        assertEq(uint256(a.status), uint256(TrustLayer.Status.Cancelled));
        assertEq(stranger.balance, callerBal, "AC-TMO-5");
        assertEq(uint256(tl.milestoneStatus(id, 0)), uint256(TrustLayer.MilestoneStatus.Settled));
        assertEq(uint256(tl.milestoneStatus(id, 1)), uint256(TrustLayer.MilestoneStatus.Voided));
    }

    function test_AC_TMO_4_earlierSettlementsUntouched() public {
        uint256 id = _active(3, uint128(ONE));
        _submit(id);
        _approve(id);
        vm.warp(_a(id).phaseDeadline);
        tl.expireFreelancerWindow(id);
        TrustLayer.Agreement memory a = _a(id);
        assertEq(a.freelancerCredit, uint128(ONE), "M0 credit intact");
        assertEq(a.clientCredit, 2 ether);
        assertEq(uint256(tl.milestoneStatus(id, 0)), uint256(TrustLayer.MilestoneStatus.Settled));
    }

    function test_AC_TMO_revisionTimeoutRefunds() public {
        uint256 id = _active(2, uint128(ONE));
        _submit(id);
        vm.prank(client);
        tl.requestRevision(id, keccak256("r"));
        uint256 deadline = _a(id).phaseDeadline;
        vm.warp(deadline - 1);
        vm.expectRevert(TrustLayer.DeadlineNotReached.selector);
        tl.expireFreelancerWindow(id);
        vm.warp(deadline);
        tl.expireFreelancerWindow(id);
        assertEq(_a(id).clientCredit, 2 ether);
        assertEq(_a(id).freelancerCredit, 0);
    }

    function test_AC_TMO_2_notWhileSubmittedOrDisputedAndNotTwice() public {
        uint256 id = _active(2, uint128(ONE));
        _submit(id);
        vm.warp(block.timestamp + 365 days);
        vm.expectRevert(TrustLayer.WrongPhase.selector);
        tl.expireFreelancerWindow(id); // Submitted: client silence is NOT a freelancer timeout

        uint256 id2 = _active(1, uint128(ONE));
        vm.warp(_a(id2).phaseDeadline);
        tl.expireFreelancerWindow(id2);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.expireFreelancerWindow(id2);
    }

    // ---- endAfterCurrent
    function test_AC_END_refundsFutureNow_currentContinues() public {
        uint256 id = _active(4, uint128(ONE));
        vm.prank(client);
        tl.endAfterCurrent(id);
        TrustLayer.Agreement memory a = _a(id);
        assertEq(a.clientCredit, 3 ether, "AC-END-3");
        assertEq(a.locked, uint128(ONE));
        assertEq(a.endIndex, 0);
        assertEq(uint256(tl.milestoneStatus(id, 0)), uint256(TrustLayer.MilestoneStatus.Working));
        assertEq(uint256(tl.milestoneStatus(id, 1)), uint256(TrustLayer.MilestoneStatus.Voided));

        _submit(id);
        _approve(id);
        a = _a(id);
        assertEq(uint256(a.status), uint256(TrustLayer.Status.Completed), "AC-END-5");
        assertEq(a.freelancerCredit, uint128(ONE));
        assertEq(a.locked, 0);
    }

    function test_AC_END_1_2_onlyClient_andNothingToEnd() public {
        uint256 id = _active(2, uint128(ONE));
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.NotClient.selector);
        tl.endAfterCurrent(id);
        vm.prank(stranger);
        vm.expectRevert(TrustLayer.NotClient.selector);
        tl.endAfterCurrent(id);
        vm.startPrank(client);
        tl.endAfterCurrent(id);
        vm.expectRevert(TrustLayer.NothingToEnd.selector);
        tl.endAfterCurrent(id);
        vm.stopPrank();

        uint256 single = _active(1, uint128(ONE));
        vm.prank(client);
        vm.expectRevert(TrustLayer.NothingToEnd.selector);
        tl.endAfterCurrent(single);
    }

    function test_AC_END_4_worksDuringDispute_andBoundsCollusion() public {
        uint256 id = _active(5, 2 ether);
        _submit(id);
        _clientDispute(id);
        vm.prank(client);
        tl.endAfterCurrent(id);
        assertEq(_a(id).clientCredit, 8 ether);
        assertEq(_a(id).locked, 2 ether);

        // a colluding arbiter can award at most the one disputed milestone
        vm.prank(primary);
        tl.resolve(id, 2 ether);
        TrustLayer.Agreement memory a = _a(id);
        assertEq(a.freelancerCredit, 2 ether);
        assertEq(a.clientCredit, 8 ether);
        assertEq(uint256(a.status), uint256(TrustLayer.Status.Completed));
    }

    function test_AC_TERM_1_everythingRevertsAfterTerminal() public {
        uint256 id = _active(1, uint128(ONE));
        _submit(id);
        _approve(id); // Completed
        bytes32 h = _a(id).termsHash;
        vm.startPrank(client);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.fund{value: 0}(id);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.approve(id);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.requestRevision(id, keccak256("r"));
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.endAfterCurrent(id);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.openDispute(id);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.cancelBeforeFunding(id);
        vm.stopPrank();
        vm.startPrank(freelancer);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.submit(id, keccak256("e"));
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.acceptAsFreelancer(id, h);
        vm.stopPrank();
        vm.prank(primary);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.resolve(id, 0);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.defaultSplit(id);
        vm.expectRevert(TrustLayer.WrongStatus.selector);
        tl.expireFreelancerWindow(id);
        // withdraw still works in a terminal state (AC-WD-7)
        vm.prank(freelancer);
        tl.withdraw(id, freelancer);
        assertEq(freelancer.balance, uint128(ONE));
    }
}

contract WithdrawTest is Base {
    function test_AC_WD_basicFlowAndCEI() public {
        uint256 id = _active(2, uint128(ONE));
        _submit(id);
        _approve(id);

        vm.prank(freelancer);
        tl.withdraw(id, freelancer);
        assertEq(freelancer.balance, uint128(ONE));
        assertEq(_a(id).freelancerCredit, 0);
        _assertConserved(id, 2 ether, ONE);

        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.NoCredit.selector);
        tl.withdraw(id, freelancer); // AC-WD-2, no double withdrawal
    }

    function test_AC_WD_1_onlyOwnCredit_strangerReverts() public {
        uint256 id = _active(1, uint128(ONE));
        _submit(id);
        _approve(id);
        vm.prank(stranger);
        vm.expectRevert(TrustLayer.NotParticipant.selector);
        tl.withdraw(id, stranger);
        // client has no credit
        vm.prank(client);
        vm.expectRevert(TrustLayer.NoCredit.selector);
        tl.withdraw(id, client);
    }

    function test_AC_WD_5_invalidRecipient() public {
        uint256 id = _active(1, uint128(ONE));
        _submit(id);
        _approve(id);
        vm.startPrank(freelancer);
        vm.expectRevert(TrustLayer.InvalidRecipient.selector);
        tl.withdraw(id, address(0));
        vm.expectRevert(TrustLayer.InvalidRecipient.selector);
        tl.withdraw(id, address(tl));
        vm.stopPrank();
    }

    function test_AC_WD_redirectToAnotherAddress() public {
        uint256 id = _active(1, uint128(ONE));
        _submit(id);
        _approve(id);
        address other = makeAddr("other");
        vm.prank(freelancer);
        tl.withdraw(id, other);
        assertEq(other.balance, uint128(ONE));
    }

    function test_withdrawUnknownAgreement() public {
        vm.expectRevert(TrustLayer.AgreementNotFound.selector);
        tl.withdraw(42, stranger);
    }

    function test_agreementsAreIsolated() public {
        uint256 a1 = _active(1, uint128(ONE));
        uint256 a2 = _active(1, 5 ether);
        _submit(a1);
        _approve(a1);
        // a2 untouched
        assertEq(_a(a2).locked, 5 ether);
        assertEq(_a(a2).freelancerCredit, 0);
        // freelancer has credit only on a1
        vm.prank(freelancer);
        vm.expectRevert(TrustLayer.NoCredit.selector);
        tl.withdraw(a2, freelancer);
        vm.prank(freelancer);
        tl.withdraw(a1, freelancer);
        assertEq(address(tl).balance, 5 ether);
    }
}
