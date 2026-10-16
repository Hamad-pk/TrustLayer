// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, Vm} from "forge-std/Test.sol";
import {TrustLayer} from "../../src/TrustLayer.sol";

/// @dev Sends ETH to `target` without calling it (selfdestruct): "forced ETH".
contract ForceEth {
    constructor(address payable target) payable {
        selfdestruct(target);
    }
}

/// @notice Drives random but mostly-valid sequences of protocol actions across several agreements and
///         maintains the ghost variables the invariants are checked against.
contract Handler is Test {
    TrustLayer public immutable tl;

    uint256 public constant MAX_AGREEMENTS = 10;
    uint256 public constant MAX_CANCELLED = 2; // cancelled-before-funding agreements must not crowd out live ones
    uint256 internal _cancelled;
    uint256[] internal _ids;

    // ---- ghost variables (not in contract storage; see docs/invariants.md)
    uint256 public ghostForced; // ETH sent outside fund()
    mapping(uint256 id => uint256) public ghostFunded;
    mapping(uint256 id => uint256) public ghostWithdrawn;
    mapping(uint256 id => mapping(uint256 index => bool)) internal _settled;
    mapping(uint256 id => uint8) internal _lastStatus;
    mapping(uint256 id => uint8) internal _lastIndex;
    mapping(uint256 id => uint8) internal _lastEndIndex;

    // ---- violation flags, asserted by the invariant contract
    bool public doubleSettled; // SAFE-3
    bool public settlementMismatch; // ACC-6
    bool public statusRegressed; // SAFE-1
    bool public indexRegressed; // SAFE-2
    bool public endIndexIncreased; // SAFE-4
    bool public isolationBroken; // ACC-8
    bool public withdrawalLeftCredit; // ACC-7
    bool public arbiterGotMoney; // SAFE-9

    // ---- coverage counters (printed after the run)
    mapping(bytes32 => uint256) public hits;
    bytes32[] internal _tags;

    uint256 internal _n; // agreement address counter

    constructor(TrustLayer _tl) {
        tl = _tl;
        vm.deal(address(this), 1_000_000 ether);
        vm.recordLogs();
    }

    // =============================================================== actions

    function createAndFund(uint256 seed) external {
        if (_ids.length >= MAX_AGREEMENTS) return;
        (uint256 id, bool ok) = _create(seed);
        if (!ok) return;
        TrustLayer.Agreement memory a = tl.getAgreement(id);
        bytes32 h = a.termsHash;
        _call(id, a.freelancer, abi.encodeCall(TrustLayer.acceptAsFreelancer, (id, h)), "accept");
        _call(id, a.primaryArbiter, abi.encodeCall(TrustLayer.acceptAsArbiter, (id, h)), "accept");
        _call(id, a.fallbackArbiter, abi.encodeCall(TrustLayer.acceptAsArbiter, (id, h)), "accept");

        uint256 total = a.total;
        TrustLayer.Agreement memory before = tl.getAgreement(id);
        bytes32 iso = _isolation(id);
        vm.prank(a.client);
        (bool funded,) = address(tl).call{value: total}(abi.encodeCall(TrustLayer.fund, (id)));
        if (funded) ghostFunded[id] = total;
        _after(id, before, iso, "fund", funded);
    }

    function createAndCancel(uint256 seed) external {
        if (_ids.length >= MAX_AGREEMENTS || _cancelled >= MAX_CANCELLED) return;
        _cancelled++;
        (uint256 id, bool ok) = _create(seed);
        if (!ok) return;
        TrustLayer.Agreement memory a = tl.getAgreement(id);
        address[4] memory who = [a.client, a.freelancer, a.primaryArbiter, a.fallbackArbiter];
        _call(id, who[seed % 4], abi.encodeCall(TrustLayer.cancelBeforeFunding, (id)), "cancelBeforeFunding");
    }

    function submit(uint256 seed) external {
        uint256 id = _pick(seed);
        if (id == 0) return;
        _call(
            id,
            tl.getAgreement(id).freelancer,
            abi.encodeCall(TrustLayer.submit, (id, keccak256(abi.encode(seed)))),
            "submit"
        );
    }

    function approve(uint256 seed) external {
        uint256 id = _pick(seed);
        if (id == 0) return;
        _call(id, tl.getAgreement(id).client, abi.encodeCall(TrustLayer.approve, (id)), "approve");
    }

    function requestRevision(uint256 seed) external {
        uint256 id = _pick(seed);
        if (id == 0) return;
        _call(
            id,
            tl.getAgreement(id).client,
            abi.encodeCall(TrustLayer.requestRevision, (id, keccak256("r"))),
            "requestRevision"
        );
    }

    function clientDispute(uint256 seed) external {
        uint256 id = _pick(seed);
        if (id == 0) return;
        _call(id, tl.getAgreement(id).client, abi.encodeCall(TrustLayer.openDispute, (id)), "clientDispute");
    }

    function freelancerDispute(uint256 seed) external {
        uint256 id = _pick(seed);
        if (id == 0) return;
        _call(id, tl.getAgreement(id).freelancer, abi.encodeCall(TrustLayer.openDispute, (id)), "freelancerDispute");
    }

    function resolve(uint256 seed, uint256 share) external {
        uint256 id = _pick(seed);
        if (id == 0) return;
        TrustLayer.Agreement memory a = tl.getAgreement(id);
        if (a.status != TrustLayer.Status.Active || a.phase != TrustLayer.Phase.Disputed) return;
        uint256 amount = tl.milestoneAmount(id, a.currentIndex);
        // mostly in-range allocations, occasionally the extremes
        uint256 pick = share % 6;
        uint256 f = pick == 0 ? 0 : pick == 1 ? amount : bound(share, 0, amount);
        address arb = block.timestamp < uint256(a.disputeOpenedAt) + 14 days ? a.primaryArbiter : a.fallbackArbiter;
        _call(id, arb, abi.encodeCall(TrustLayer.resolve, (id, f)), "resolve");
    }

    function defaultSplit(uint256 seed) external {
        uint256 id = _pick(seed);
        if (id == 0) return;
        _call(id, address(0xBEEF), abi.encodeCall(TrustLayer.defaultSplit, (id)), "defaultSplit");
    }

    function expire(uint256 seed) external {
        uint256 id = _pick(seed);
        if (id == 0) return;
        _call(id, address(0xBEEF), abi.encodeCall(TrustLayer.expireFreelancerWindow, (id)), "expire");
    }

    function endAfterCurrent(uint256 seed) external {
        uint256 id = _pick(seed);
        if (id == 0) return;
        _call(id, tl.getAgreement(id).client, abi.encodeCall(TrustLayer.endAfterCurrent, (id)), "endAfterCurrent");
    }

    function withdraw(uint256 seed, uint256 whoSeed, uint256 toSeed) external {
        uint256 id = _pick(seed);
        if (id == 0) return;
        TrustLayer.Agreement memory a = tl.getAgreement(id);
        bool asClient = whoSeed % 2 == 0;
        address who = asClient ? a.client : a.freelancer;
        uint256 credit = asClient ? a.clientCredit : a.freelancerCredit;
        address to = toSeed % 3 == 0 ? who : address(uint160(0xD00D0000 + (toSeed % 5)));

        bytes32 iso = _isolation(id);
        vm.prank(who);
        (bool ok,) = address(tl).call(abi.encodeCall(TrustLayer.withdraw, (id, to)));
        if (ok) {
            ghostWithdrawn[id] += credit;
            TrustLayer.Agreement memory post = tl.getAgreement(id);
            if ((asClient ? post.clientCredit : post.freelancerCredit) != 0) withdrawalLeftCredit = true;
        }
        _after(id, a, iso, "withdraw", ok);
    }

    /// @notice State-aware step: pick a random agreement and try a plausible next action for its current phase.
    ///         Without this, uniformly random calls almost never satisfy the preconditions for deep states
    ///         (disputes, defaults, timeouts), and the invariants would pass vacuously.
    function advance(uint256 seed, uint256 choice) external {
        uint256 id = _pickLive(seed);
        if (id == 0) {
            // nothing live: let withdrawals from terminal agreements happen
            id = _pick(seed);
            if (id == 0) return;
        }
        // the delegated actions re-pick via _pick(seed): hand them the chosen agreement's own index
        for (uint256 i; i < _ids.length; ++i) {
            if (_ids[i] == id) seed = i;
        }
        TrustLayer.Agreement memory a = tl.getAgreement(id);
        uint256 r = choice % 10;
        uint256 extra = choice >> 8;

        if (a.status == TrustLayer.Status.Proposed) return;
        if (a.status != TrustLayer.Status.Active) {
            this.withdraw(seed, extra, extra >> 8);
            return;
        }
        if (r == 9 && extra % 6 == 0) {
            this.endAfterCurrent(seed);
            return;
        }
        if (a.phase == TrustLayer.Phase.Working) {
            if (r < 8) {
                this.submit(seed);
            } else {
                this.warpToBoundary(seed, extra);
                this.expire(seed);
            }
        } else if (a.phase == TrustLayer.Phase.Submitted) {
            if (r < 3) {
                this.approve(seed);
            } else if (r == 3) {
                this.requestRevision(seed);
            } else if (r < 6) {
                this.clientDispute(seed);
            } else if (r < 8) {
                this.warpToBoundary(seed, 1); // exactly at the review deadline
                this.freelancerDispute(seed);
            } else {
                this.warp(7); // 28 days: far past the review deadline
                this.approve(seed); // late approval, valid until a dispute opens
            }
        } else if (a.phase == TrustLayer.Phase.RevisionRequested) {
            if (r < 4) {
                this.submit(seed);
            } else if (r < 7) {
                this.freelancerDispute(seed);
            } else {
                this.warpToBoundary(seed, 1);
                this.expire(seed);
            }
        } else {
            // Disputed
            if (r < 4) {
                this.resolve(seed, extra);
            } else if (r < 6) {
                this.warpToBoundary(seed, 1); // lands on +14d: fallback window opens
                this.resolve(seed, extra);
            } else {
                this.warpToBoundary(seed, 1);
                this.warpToBoundary(seed, 1); // lands on +28d: default split opens
                this.defaultSplit(seed);
            }
        }
    }

    function warp(uint256 stepSeed) external {
        uint256[9] memory steps = [uint256(1 hours), 1 days, 3 days, 7 days, 8 days, 14 days, 15 days, 28 days, 29 days];
        vm.warp(block.timestamp + steps[stepSeed % 9]);
    }

    /// @dev Jump to the next deadline of an agreement: exercises the exact `<` / `>=` boundaries.
    function warpToBoundary(uint256 seed, uint256 offsetSeed) external {
        uint256 id = _pick(seed);
        if (id == 0) return;
        TrustLayer.Agreement memory a = tl.getAgreement(id);
        if (a.status != TrustLayer.Status.Active) return;
        uint256 t;
        if (a.phase == TrustLayer.Phase.Disputed) {
            uint256 p = uint256(a.disputeOpenedAt) + 14 days;
            t = block.timestamp < p ? p : uint256(a.disputeOpenedAt) + 28 days;
        } else {
            t = a.phaseDeadline;
        }
        // land one second before, exactly on, or one second after the boundary
        uint256 o = offsetSeed % 3;
        t = o == 0 ? t - 1 : o == 1 ? t : t + 1;
        if (t > block.timestamp) vm.warp(t);
    }

    function forceEth(uint256 amount) external {
        amount = bound(amount, 1, 5 ether);
        new ForceEth{value: amount}(payable(address(tl)));
        ghostForced += amount;
    }

    // ================================================================ views

    function ids() external view returns (uint256[] memory) {
        return _ids;
    }

    function tags() external view returns (bytes32[] memory) {
        return _tags;
    }

    // ============================================================= internals

    function _create(uint256 seed) internal returns (uint256 id, bool ok) {
        uint256 n = bound(seed, 1, 6);
        uint256 base = 0x10000 * (++_n);
        address c = address(uint160(base + 1));
        address f = address(uint160(base + 2));
        address p = address(uint160(base + 3));
        address fb = address(uint160(base + 4));
        vm.deal(c, 1_000 ether);

        TrustLayer.MilestoneInput[] memory ms = new TrustLayer.MilestoneInput[](n);
        for (uint256 i; i < n; ++i) {
            // include odd wei amounts: they exercise the default-split remainder
            uint128 amt = uint128(bound(uint256(keccak256(abi.encode(seed, i))), 1, 20 ether));
            ms[i] = TrustLayer.MilestoneInput(amt, keccak256(abi.encode("d", i)), keccak256(abi.encode("c", i)));
        }
        bytes32 iso = bytes32(0);
        vm.prank(c);
        id = tl.create(f, p, fb, ms);
        _ids.push(id);
        ok = true;
        TrustLayer.Agreement memory a = tl.getAgreement(id);
        _lastStatus[id] = uint8(a.status);
        _lastEndIndex[id] = a.endIndex;
        iso; // isolation of creation is implied: it writes only a new id
        _drainLogs(id);
    }

    function _pick(uint256 seed) internal view returns (uint256) {
        if (_ids.length == 0) return 0;
        return _ids[seed % _ids.length];
    }

    /// @dev First Active agreement at or after a seed-chosen position (wrapping), or 0.
    function _pickLive(uint256 seed) internal view returns (uint256) {
        uint256 n = _ids.length;
        for (uint256 i; i < n; ++i) {
            uint256 id = _ids[(seed + i) % n];
            if (tl.getAgreement(id).status == TrustLayer.Status.Active) return id;
        }
        return 0;
    }

    function _call(uint256 id, address who, bytes memory data, bytes32 tag) internal returns (bool ok) {
        TrustLayer.Agreement memory before = tl.getAgreement(id);
        bytes32 iso = _isolation(id);
        vm.prank(who);
        (ok,) = address(tl).call(data);
        _after(id, before, iso, tag, ok);
    }

    function _after(uint256 id, TrustLayer.Agreement memory before, bytes32 iso, bytes32 tag, bool ok) internal {
        if (ok) {
            if (hits[tag]++ == 0) _tags.push(tag);
        }
        TrustLayer.Agreement memory a = tl.getAgreement(id);

        // SAFE-1: status only moves forward along the allowed edges
        uint8 prevS = uint8(before.status);
        uint8 newS = uint8(a.status);
        bool terminalBefore = prevS == uint8(TrustLayer.Status.Completed) || prevS == uint8(TrustLayer.Status.Cancelled);
        if (terminalBefore && newS != prevS) statusRegressed = true;
        if (prevS == uint8(TrustLayer.Status.Active) && newS < prevS) statusRegressed = true;
        if (prevS == uint8(TrustLayer.Status.Proposed) && newS == uint8(TrustLayer.Status.Completed)) {
            statusRegressed = true;
        }
        // SAFE-2: currentIndex never decreases
        if (a.currentIndex < before.currentIndex) indexRegressed = true;
        // SAFE-4: endIndex never increases
        if (a.endIndex > before.endIndex) endIndexIncreased = true;
        // ACC-8: nothing else changed
        if (_isolation(id) != iso) isolationBroken = true;

        _drainLogs(id);
    }

    /// @dev Parses MilestoneSettled events: checks ACC-6 (amounts sum) and SAFE-3 (settled once).
    function _drainLogs(uint256 id) internal {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].emitter != address(tl)) continue;
            if (logs[i].topics[0] != TrustLayer.MilestoneSettled.selector) continue;
            uint256 eid = uint256(logs[i].topics[1]);
            uint256 index = uint256(logs[i].topics[2]);
            (uint256 c, uint256 f,) = abi.decode(logs[i].data, (uint256, uint256, uint8));
            if (c + f != tl.milestoneAmount(eid, index)) settlementMismatch = true;
            if (_settled[eid][index]) doubleSettled = true;
            _settled[eid][index] = true;
        }
        id;
    }

    /// @dev Digest of every agreement other than `id`, to prove an action on `id` cannot touch the others.
    function _isolation(uint256 id) internal view returns (bytes32 d) {
        for (uint256 i; i < _ids.length; ++i) {
            if (_ids[i] == id) continue;
            d = keccak256(abi.encode(d, tl.getAgreement(_ids[i])));
        }
    }
}
