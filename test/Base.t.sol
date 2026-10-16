// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {TrustLayer} from "../src/TrustLayer.sol";

/// @dev Shared fixtures. Every test file inherits from this.
abstract contract Base is Test {
    TrustLayer internal tl;

    address internal client = makeAddr("client");
    address internal freelancer = makeAddr("freelancer");
    address internal primary = makeAddr("primary");
    address internal fallbackArb = makeAddr("fallbackArb");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant ONE = 1 ether;

    function setUp() public virtual {
        tl = new TrustLayer();
        vm.deal(client, 1_000_000 ether);
    }

    function _ms(uint256 n, uint128 amount) internal pure returns (TrustLayer.MilestoneInput[] memory ms) {
        ms = new TrustLayer.MilestoneInput[](n);
        for (uint256 i; i < n; ++i) {
            ms[i] = TrustLayer.MilestoneInput({
                amount: amount,
                deliverableHash: keccak256(abi.encode("deliverable", i)),
                criteriaHash: keccak256(abi.encode("criteria", i))
            });
        }
    }

    function _create(uint256 n, uint128 amount) internal returns (uint256 id) {
        vm.prank(client);
        id = tl.create(freelancer, primary, fallbackArb, _ms(n, amount));
    }

    function _acceptAll(uint256 id) internal {
        bytes32 h = tl.getAgreement(id).termsHash;
        vm.prank(freelancer);
        tl.acceptAsFreelancer(id, h);
        vm.prank(primary);
        tl.acceptAsArbiter(id, h);
        vm.prank(fallbackArb);
        tl.acceptAsArbiter(id, h);
    }

    function _fund(uint256 id) internal {
        uint256 total = tl.getAgreement(id).total; // read first: a prank applies to the very next external call
        vm.prank(client);
        tl.fund{value: total}(id);
    }

    function _active(uint256 n, uint128 amount) internal returns (uint256 id) {
        id = _create(n, amount);
        _acceptAll(id);
        _fund(id);
    }

    function _submit(uint256 id) internal {
        vm.prank(freelancer);
        tl.submit(id, keccak256("evidence"));
    }

    function _approve(uint256 id) internal {
        vm.prank(client);
        tl.approve(id);
    }

    function _clientDispute(uint256 id) internal {
        vm.prank(client);
        tl.openDispute(id);
    }

    function _a(uint256 id) internal view returns (TrustLayer.Agreement memory) {
        return tl.getAgreement(id);
    }

    /// @dev ACC-1 for a single agreement, given the ghost of what has been withdrawn.
    function _assertConserved(uint256 id, uint256 funded, uint256 withdrawn) internal view {
        TrustLayer.Agreement memory a = tl.getAgreement(id);
        assertEq(funded, uint256(a.locked) + a.clientCredit + a.freelancerCredit + withdrawn, "ACC-1");
    }
}
