// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base} from "./Base.t.sol";
import {TrustLayer} from "../src/TrustLayer.sol";

contract FuzzTest is Base {
    /// AC-RES-3 / ACC-6: any valid ruling allocates exactly the milestone amount, once.
    function testFuzz_ruling_allocatesExactlyTheAmount(uint128 amount, uint256 freelancerShare) public {
        amount = uint128(bound(amount, 1, 400_000 ether)); // client holds 1M ETH; two milestones are funded
        freelancerShare = bound(freelancerShare, 0, amount);
        uint256 id = _active(2, amount);
        _submit(id);
        _clientDispute(id);
        vm.prank(primary);
        tl.resolve(id, freelancerShare);
        TrustLayer.Agreement memory a = _a(id);
        assertEq(uint256(a.freelancerCredit), freelancerShare);
        assertEq(uint256(a.clientCredit), amount - freelancerShare);
        assertEq(uint256(a.locked), amount); // the second milestone is still locked
        _assertConserved(id, uint256(amount) * 2, 0);
    }

    /// AC-RES-3: an over-allocation always reverts.
    function testFuzz_ruling_overAllocationReverts(uint128 amount, uint256 extra) public {
        amount = uint128(bound(amount, 1, 1_000_000 ether));
        extra = bound(extra, 1, type(uint128).max);
        uint256 id = _active(1, amount);
        _submit(id);
        _clientDispute(id);
        vm.prank(primary);
        vm.expectRevert(TrustLayer.InvalidAllocation.selector);
        tl.resolve(id, uint256(amount) + extra);
    }

    /// AC-RES-5: default split is exact for every amount including odd wei; the freelancer gets the remainder.
    function testFuzz_defaultSplit_exact(uint128 amount) public {
        amount = uint128(bound(amount, 1, 1_000_000 ether));
        uint256 id = _active(1, amount);
        _submit(id);
        _clientDispute(id);
        vm.warp(block.timestamp + 28 days);
        tl.defaultSplit(id);
        TrustLayer.Agreement memory a = _a(id);
        assertEq(uint256(a.clientCredit), uint256(amount) / 2);
        assertEq(uint256(a.clientCredit) + a.freelancerCredit, amount);
        assertGe(a.freelancerCredit, a.clientCredit);
    }

    /// AC-CRE-3 / ACC-2: total equals the sum, and locked equals the sum after funding.
    function testFuzz_create_totalIsSum(uint8 n, uint128 seed) public {
        n = uint8(bound(n, 1, 20));
        TrustLayer.MilestoneInput[] memory ms = new TrustLayer.MilestoneInput[](n);
        uint256 sum;
        for (uint256 i; i < n; ++i) {
            uint128 amt = uint128(bound(uint256(keccak256(abi.encode(seed, i))), 1, 100 ether));
            ms[i] = TrustLayer.MilestoneInput(amt, keccak256("d"), keccak256("c"));
            sum += amt;
        }
        vm.prank(client);
        uint256 id = tl.create(freelancer, primary, fallbackArb, ms);
        assertEq(_a(id).total, sum);
        _acceptAll(id);
        _fund(id);
        assertEq(_a(id).locked, sum);
        assertEq(address(tl).balance, sum);
    }

    /// AC-CRE-1: any participant collision reverts.
    function testFuzz_create_duplicateParticipantsRevert(uint8 pick) public {
        pick = uint8(bound(pick, 0, 5));
        address[4] memory p = [client, freelancer, primary, fallbackArb];
        // collapse one pair
        if (pick == 0) p[1] = p[0];
        else if (pick == 1) p[2] = p[0];
        else if (pick == 2) p[3] = p[0];
        else if (pick == 3) p[2] = p[1];
        else if (pick == 4) p[3] = p[1];
        else p[3] = p[2];
        vm.prank(client);
        vm.expectRevert(TrustLayer.InvalidParticipants.selector);
        tl.create(p[1], p[2], p[3], _ms(1, 1));
    }

    /// AC-SUB-3 / boundary convention: exactly one of submit / expire is valid at any instant after activation.
    function testFuzz_submitVsExpire_exactlyOneValid(uint256 offset) public {
        offset = bound(offset, 0, 60 days);
        uint256 id = _active(1, uint128(ONE));
        uint256 deadline = _a(id).phaseDeadline;
        vm.warp(block.timestamp + offset);

        bool canSubmit = block.timestamp < deadline;
        vm.prank(freelancer);
        (bool submitOk,) = address(tl).call(abi.encodeCall(TrustLayer.submit, (id, keccak256("e"))));
        if (submitOk) {
            assertTrue(canSubmit);
            return;
        }
        assertFalse(canSubmit);
        (bool expireOk,) = address(tl).call(abi.encodeCall(TrustLayer.expireFreelancerWindow, (id)));
        assertTrue(expireOk);
    }

    /// AUTH-7: nobody but the credited party can withdraw.
    function testFuzz_withdraw_onlyParties(address caller) public {
        vm.assume(caller != freelancer && caller != client && caller != address(0));
        uint256 id = _active(1, uint128(ONE));
        _submit(id);
        _approve(id);
        vm.prank(caller);
        vm.expectRevert(TrustLayer.NotParticipant.selector);
        tl.withdraw(id, caller);
    }

    /// AUTH-4: resolve by anyone other than the right arbiter in the right window always reverts.
    function testFuzz_resolve_onlyRightArbiter(address caller, uint256 offset) public {
        offset = bound(offset, 0, 60 days);
        uint256 id = _active(1, uint128(ONE));
        _submit(id);
        _clientDispute(id);
        uint256 opened = block.timestamp;
        vm.warp(opened + offset);

        address expected = offset < 14 days ? primary : (offset < 28 days ? fallbackArb : address(0));
        vm.prank(caller);
        (bool ok,) = address(tl).call(abi.encodeCall(TrustLayer.resolve, (id, 0)));
        assertEq(ok, expected != address(0) && caller == expected);
    }

    /// AUTH-5: only the right party may open a dispute at the right time.
    function testFuzz_openDispute_authorization(address caller, uint256 offset) public {
        offset = bound(offset, 0, 30 days);
        uint256 id = _active(1, uint128(ONE));
        _submit(id);
        uint256 deadline = _a(id).phaseDeadline;
        vm.warp(block.timestamp + offset);
        vm.prank(caller);
        (bool ok,) = address(tl).call(abi.encodeCall(TrustLayer.openDispute, (id)));
        bool expected = caller == client || (caller == freelancer && block.timestamp >= deadline);
        assertEq(ok, expected);
    }
}
