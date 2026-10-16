// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base} from "./Base.t.sol";
import {TrustLayer} from "../src/TrustLayer.sol";

/// @dev Freelancer contract that tries to re-enter withdraw() from its receive hook.
contract ReentrantReceiver {
    TrustLayer public tl;
    uint256 public id;
    bool public reentered;
    bool public reentrySucceeded;

    constructor(TrustLayer _tl) {
        tl = _tl;
    }

    function setId(uint256 _id) external {
        id = _id;
    }

    receive() external payable {
        if (reentered) return;
        reentered = true;
        try tl.withdraw(id, address(this)) {
            reentrySucceeded = true;
        } catch {}
    }
}

/// @dev Freelancer contract that always rejects ETH.
contract RejectingReceiver {
    receive() external payable {
        revert("no ETH");
    }
}

/// @dev Burns all forwarded gas in receive().
contract GasBurner {
    receive() external payable {
        while (true) {}
    }
}

/// @dev Sends ETH to a target without calling it (selfdestruct), i.e. "forced ETH".
contract ForceSender {
    constructor(address payable target) payable {
        selfdestruct(target);
    }
}

contract AdversarialTest is Base {
    function _withContractFreelancer(address fl) internal returns (uint256 id) {
        vm.prank(client);
        id = tl.create(fl, primary, fallbackArb, _ms(1, uint128(ONE)));
        bytes32 h = _a(id).termsHash;
        vm.prank(fl);
        tl.acceptAsFreelancer(id, h);
        vm.prank(primary);
        tl.acceptAsArbiter(id, h);
        vm.prank(fallbackArb);
        tl.acceptAsArbiter(id, h);
        _fund(id);
        vm.prank(fl);
        tl.submit(id, keccak256("e"));
        _approve(id);
    }

    // threat 22: reentrant withdrawal
    function test_reentrantReceiver_isPaidExactlyOnce() public {
        ReentrantReceiver r = new ReentrantReceiver(tl);
        uint256 id = _withContractFreelancer(address(r));
        r.setId(id);
        // a second agreement keeps extra ETH in the contract, so a successful re-entry would have funds to steal
        _active(1, 10 ether);

        vm.prank(address(r));
        tl.withdraw(id, address(r));

        assertTrue(r.reentered(), "hook ran");
        assertFalse(r.reentrySucceeded(), "re-entry must fail");
        assertEq(address(r).balance, ONE, "paid exactly once");
        assertEq(address(tl).balance, 10 ether, "other agreement's escrow untouched");
        assertEq(_a(id).freelancerCredit, 0);
    }

    // threat 23: reverting receiver does not lose the credit and cannot block the client
    function test_revertingReceiver_creditPreservedAndOthersUnblocked() public {
        RejectingReceiver r = new RejectingReceiver();
        uint256 id = _withContractFreelancer(address(r));

        vm.prank(address(r));
        vm.expectRevert(TrustLayer.TransferFailed.selector);
        tl.withdraw(id, address(r));
        assertEq(_a(id).freelancerCredit, uint128(ONE), "credit restored by revert");

        // redirect works
        address safe = makeAddr("safe");
        vm.prank(address(r));
        tl.withdraw(id, safe);
        assertEq(safe.balance, ONE);
    }

    function test_revertingReceiver_doesNotBlockClientWithdrawal() public {
        // freelancer is a rejecting contract; the client gets a refund via timeout and can still withdraw
        RejectingReceiver r = new RejectingReceiver();
        vm.prank(client);
        uint256 id = tl.create(address(r), primary, fallbackArb, _ms(2, uint128(ONE)));
        bytes32 h = _a(id).termsHash;
        vm.prank(address(r));
        tl.acceptAsFreelancer(id, h);
        vm.prank(primary);
        tl.acceptAsArbiter(id, h);
        vm.prank(fallbackArb);
        tl.acceptAsArbiter(id, h);
        _fund(id);
        vm.warp(_a(id).phaseDeadline);
        tl.expireFreelancerWindow(id);

        uint256 before = client.balance;
        vm.prank(client);
        tl.withdraw(id, client);
        assertEq(client.balance, before + 2 ether);
    }

    // threat 23: gas-hungry receiver cannot make the call hang the system, it only fails its own withdrawal
    function test_gasBurningReceiver_onlyHurtsItself() public {
        GasBurner g = new GasBurner();
        uint256 id = _withContractFreelancer(address(g));
        vm.prank(address(g));
        vm.expectRevert(); // out of gas inside the call: forwards 63/64, caller reverts
        tl.withdraw{gas: 200_000}(id, address(g));
        assertEq(_a(id).freelancerCredit, uint128(ONE));
    }

    // threat 25: forced ETH changes the balance but no accounting, and nothing breaks
    function test_forcedEth_isStrandedAndHarmless() public {
        uint256 id = _active(1, uint128(ONE));
        new ForceSender{value: 5 ether}(payable(address(tl)));
        assertEq(address(tl).balance, 6 ether);
        assertEq(_a(id).locked, uint128(ONE));

        _submit(id);
        _approve(id);
        vm.prank(freelancer);
        tl.withdraw(id, freelancer);
        assertEq(freelancer.balance, ONE);
        assertEq(address(tl).balance, 5 ether, "forced ETH stranded; liabilities are zero");
        // balance >= liabilities (ACC-5) and funded == withdrawn (ACC-1)
        _assertConserved(id, ONE, ONE);
    }

    // threat 20: timeouts and exits must fit in a block with the maximum milestone count
    function test_gas_timeoutAndEndWithMaxMilestones() public {
        uint256 id = _active(20, uint128(ONE));
        vm.warp(_a(id).phaseDeadline);
        uint256 g = gasleft();
        tl.expireFreelancerWindow(id);
        uint256 used = g - gasleft();
        emit log_named_uint("gas: expireFreelancerWindow, 20 milestones", used);
        assertLt(used, 100_000);

        uint256 id2 = _active(20, uint128(ONE));
        vm.prank(client);
        g = gasleft();
        tl.endAfterCurrent(id2);
        used = g - gasleft();
        emit log_named_uint("gas: endAfterCurrent, 20 milestones", used);
        assertLt(used, 100_000);
        assertEq(_a(id2).clientCredit, 19 ether);
    }

    // threat 19 / S5: freelancer + arbiter collusion costs at most the milestone in flight
    function test_collusion_freelancerAndArbiter_boundedByEndAfterCurrent() public {
        uint256 id = _active(5, uint128(ONE));
        // M0 settles to the freelancer by a colluding ruling
        _submit(id);
        _clientDispute(id);
        vm.prank(primary);
        tl.resolve(id, ONE);
        // client notices and ends the agreement; M1 is in flight, M2..M4 are refunded
        vm.prank(client);
        tl.endAfterCurrent(id);
        assertEq(_a(id).clientCredit, 3 ether);
        _submit(id);
        _clientDispute(id);
        vm.prank(primary);
        tl.resolve(id, ONE);
        TrustLayer.Agreement memory a = _a(id);
        assertEq(a.freelancerCredit, 2 ether, "total loss: two milestones, never the full escrow");
        assertEq(uint256(a.status), uint256(TrustLayer.Status.Completed));
        _assertConserved(id, 5 ether, 0);
    }

    // threat 6/7 / S4: freelancer finishes M0 then abandons: keeps M0, gets nothing for M1
    function test_freelancerWalksAway_keepsOnlyEarnedWork() public {
        uint256 id = _active(2, uint128(ONE));
        _submit(id);
        _approve(id);
        vm.warp(_a(id).phaseDeadline);
        tl.expireFreelancerWindow(id);
        TrustLayer.Agreement memory a = _a(id);
        assertEq(a.freelancerCredit, ONE);
        assertEq(a.clientCredit, ONE);
    }
}
